import { and, desc, eq } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { auditLog } from "@syntaxerror/db/schema";
import { enlaceAvance } from "@/lib/cuenta/enlaces";
import type { MetaRequest } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import { avanceDelAlumno } from "./datos";
import { casoEnCurso, siguienteDelAvance, trabasDelAlumno } from "./trabas";

// Un envío por alumno cada 10 minutos: evita el email doble de un clic repetido.
export const ESPERA_ENVIO_MS = 10 * 60_000;
export const MAXIMO_NOTA = 1000;

export type UltimoEnvio = { fecha: Date; actorEmail: string | null };

// El historial de envíos es la bitácora: no hace falta otra tabla.
export async function ultimoEnvio(db: AppDb, userId: string): Promise<UltimoEnvio | null> {
  const [fila] = await db
    .select({ fecha: auditLog.createdAt, actorEmail: auditLog.actorEmail })
    .from(auditLog)
    .where(and(eq(auditLog.action, "progress_sent"), eq(auditLog.targetId, userId)))
    .orderBy(desc(auditLog.createdAt))
    .limit(1);
  return fila ?? null;
}

export async function enviarAvance(
  db: AppDb,
  { admin, userId, nota }: { admin: { id: string; email: string }; userId: string; nota: string | null },
  { encolar, meta, ahora = new Date() }: { encolar: Encolar; meta: MetaRequest; ahora?: Date }
): Promise<"ok" | "no_existe" | "reciente"> {
  const avance = await avanceDelAlumno(db, userId);
  if (!avance) return "no_existe";
  const ultimo = await ultimoEnvio(db, userId);
  if (ultimo && ahora.getTime() - ultimo.fecha.getTime() < ESPERA_ENVIO_MS) return "reciente";

  const notaLimpia = nota?.trim() || null;
  const trabas = trabasDelAlumno(avance, ahora);
  const actual = casoEnCurso(avance);
  // Si la cola falla, el error sale antes de la bitácora: el envío no queda registrado y se puede reintentar.
  await encolar({
    tipo: "avance",
    para: avance.perfil.email,
    nombre: avance.perfil.nombre,
    nota: notaLimpia,
    rutas: avance.rutas.map((ruta) => ({ titulo: ruta.titulo, completos: ruta.completos, total: ruta.casos.length })),
    enCurso: actual ? { caso: actual.caso.titulo, leccion: actual.leccion?.titulo ?? null } : null,
    pasos: trabas.length > 0 ? trabas.map((traba) => traba.alumno) : [siguienteDelAvance(avance).texto],
    enlace: enlaceAvance(),
  });
  await insertAuditLogEntry(db, {
    actorId: admin.id,
    actorEmail: admin.email,
    action: "progress_sent",
    targetType: "user",
    targetId: userId,
    metadata: { nota: notaLimpia, email: avance.perfil.email },
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });
  return "ok";
}
