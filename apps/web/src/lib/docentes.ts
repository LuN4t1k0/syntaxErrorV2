import { and, desc, eq } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { solicitudesDocente, users } from "@syntaxerror/db/schema";
import type { MetaRequest } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import { esDocente, listarAdmins, type Rol } from "@/lib/roles";
import type { UsuarioActual } from "@/lib/sesion";

export type EstadoDocencia = "docente" | "pendiente" | "puede_solicitar";

export async function estadoDocencia(db: AppDb, usuario: { id: string; rol: Rol }): Promise<EstadoDocencia> {
  if (esDocente(usuario)) return "docente";
  const [ultima] = await db
    .select({ estado: solicitudesDocente.estado })
    .from(solicitudesDocente)
    .where(eq(solicitudesDocente.userId, usuario.id))
    .orderBy(desc(solicitudesDocente.creadaEn))
    .limit(1);
  return ultima?.estado === "pendiente" ? "pendiente" : "puede_solicitar";
}

export async function solicitarDocencia(db: AppDb, usuario: UsuarioActual, { encolar }: { encolar: Encolar }): Promise<EstadoDocencia> {
  if (esDocente(usuario)) return "docente";
  // El índice único parcial deja una sola solicitud pendiente por persona, aunque lleguen dos clics.
  const creadas = await db.insert(solicitudesDocente).values({ userId: usuario.id }).onConflictDoNothing().returning({ id: solicitudesDocente.id });
  if (creadas.length > 0) {
    const solicitante = usuario.nombre ? `${usuario.nombre} (${usuario.email})` : usuario.email;
    for (const admin of await listarAdmins(db)) {
      await encolar({ tipo: "solicitud-docente-nueva", para: admin.email, nombre: admin.nombre, solicitante });
    }
  }
  return "pendiente";
}

export async function decidirSolicitud(
  db: AppDb,
  { solicitudId, admin, decision }: { solicitudId: string; admin: { id: string; email: string }; decision: "aprobada" | "rechazada" },
  meta: MetaRequest
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [solicitud] = await tx
      .update(solicitudesDocente)
      .set({ estado: decision, revisadaEn: new Date(), revisadaPor: admin.id })
      .where(and(eq(solicitudesDocente.id, solicitudId), eq(solicitudesDocente.estado, "pendiente")))
      .returning({ userId: solicitudesDocente.userId });
    if (!solicitud) return false;
    if (decision === "aprobada") {
      // Solo sube a teacher a quien es student: nunca le quita el rol a una cuenta admin.
      const [cambiado] = await tx
        .update(users)
        .set({ role: "teacher", updatedAt: new Date() })
        .where(and(eq(users.id, solicitud.userId), eq(users.role, "student")))
        .returning({ id: users.id });
      if (cambiado) {
        await insertAuditLogEntry(tx, {
          actorId: admin.id,
          actorEmail: admin.email,
          action: "role_changed",
          targetType: "user",
          targetId: solicitud.userId,
          metadata: { rolAnterior: "student", rolNuevo: "teacher", solicitudId },
          ipAddress: meta.ip,
          userAgent: meta.userAgent,
        });
      }
    }
    return true;
  });
}
