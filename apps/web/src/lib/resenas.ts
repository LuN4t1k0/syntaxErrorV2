import { and, avg, count, desc, eq } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { casoInscripciones, casos, resenasCaso, users } from "@syntaxerror/db/schema";
import type { MetaRequest } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import { listarAdmins } from "@/lib/roles";

export type EstadoComentario = "pendiente" | "aprobado" | "rechazado";
export type MiResena =
  | { estado: "sin_sesion" }
  | { estado: "no_completado" }
  | { estado: "puede_resenar" }
  | { estado: "ya_reseno"; estrellas: number; comentario: string | null; estadoComentario: EstadoComentario | null };
export type ResumenResenas = {
  promedio: number;
  cantidad: number;
  comentarios: { id: string; nombre: string; estrellas: number; comentario: string; creadaEn: string }[];
};
export type ResultadoResena = { ok: true } | { ok: false; motivo: "caso_no_existe" | "no_completado" | "ya_reseno" };

async function buscarCaso(db: AppDb, slug: string) {
  const [caso] = await db.select({ id: casos.id, titulo: casos.titulo }).from(casos).where(eq(casos.slug, slug));
  return caso ?? null;
}

async function completo(db: AppDb, userId: string, casoId: string): Promise<boolean> {
  const [inscripcion] = await db
    .select({ completadoEn: casoInscripciones.completadoEn })
    .from(casoInscripciones)
    .where(and(eq(casoInscripciones.userId, userId), eq(casoInscripciones.casoId, casoId)));
  return Boolean(inscripcion?.completadoEn);
}

// En público se muestra solo el primer nombre de quien reseña.
function primerNombre(nombre: string | null): string {
  return nombre?.trim().split(/\s+/)[0] || "Estudiante";
}

export async function miResena(db: AppDb, userId: string | null, casoSlug: string): Promise<MiResena | null> {
  const caso = await buscarCaso(db, casoSlug);
  if (!caso) return null;
  if (!userId) return { estado: "sin_sesion" };
  const [propia] = await db
    .select({ estrellas: resenasCaso.estrellas, comentario: resenasCaso.comentario, estadoComentario: resenasCaso.estadoComentario })
    .from(resenasCaso)
    .where(and(eq(resenasCaso.userId, userId), eq(resenasCaso.casoId, caso.id)));
  if (propia) return { estado: "ya_reseno", ...propia, estadoComentario: propia.estadoComentario as EstadoComentario | null };
  return (await completo(db, userId, caso.id)) ? { estado: "puede_resenar" } : { estado: "no_completado" };
}

export async function resumenResenas(db: AppDb, casoSlug: string): Promise<ResumenResenas | null> {
  const caso = await buscarCaso(db, casoSlug);
  if (!caso) return null;
  const [[totales], comentarios] = await Promise.all([
    db.select({ promedio: avg(resenasCaso.estrellas), cantidad: count() }).from(resenasCaso).where(eq(resenasCaso.casoId, caso.id)),
    db
      .select({ id: resenasCaso.id, nombre: users.name, estrellas: resenasCaso.estrellas, comentario: resenasCaso.comentario, creadaEn: resenasCaso.creadaEn })
      .from(resenasCaso)
      .innerJoin(users, eq(users.id, resenasCaso.userId))
      .where(and(eq(resenasCaso.casoId, caso.id), eq(resenasCaso.estadoComentario, "aprobado")))
      .orderBy(desc(resenasCaso.creadaEn))
      .limit(20),
  ]);
  const cantidad = Number(totales?.cantidad ?? 0);
  return {
    promedio: cantidad > 0 ? Math.round(Number(totales.promedio) * 10) / 10 : 0,
    cantidad,
    comentarios: comentarios.map((fila) => ({
      id: fila.id,
      nombre: primerNombre(fila.nombre),
      estrellas: fila.estrellas,
      comentario: fila.comentario ?? "",
      creadaEn: fila.creadaEn.toISOString(),
    })),
  };
}

export async function crearResena(
  db: AppDb,
  { userId, casoSlug, estrellas, comentario }: { userId: string; casoSlug: string; estrellas: number; comentario: string | null },
  { encolar }: { encolar: Encolar }
): Promise<ResultadoResena> {
  const caso = await buscarCaso(db, casoSlug);
  if (!caso) return { ok: false, motivo: "caso_no_existe" };
  if (!(await completo(db, userId, caso.id))) return { ok: false, motivo: "no_completado" };

  const texto = comentario?.trim() || null;
  const creadas = await db
    .insert(resenasCaso)
    .values({ userId, casoId: caso.id, estrellas, comentario: texto, estadoComentario: texto ? "pendiente" : null })
    .onConflictDoNothing()
    .returning({ id: resenasCaso.id });
  if (creadas.length === 0) return { ok: false, motivo: "ya_reseno" };

  if (texto) {
    for (const admin of await listarAdmins(db)) {
      await encolar({ tipo: "resena-nueva", para: admin.email, nombre: admin.nombre, caso: caso.titulo, estrellas, comentario: texto });
    }
  }
  return { ok: true };
}

export async function moderarComentario(
  db: AppDb,
  { resenaId, admin, decision }: { resenaId: string; admin: { id: string; email: string }; decision: "aprobado" | "rechazado" },
  meta: MetaRequest
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [moderada] = await tx
      .update(resenasCaso)
      .set({ estadoComentario: decision, moderadaPor: admin.id })
      .where(and(eq(resenasCaso.id, resenaId), eq(resenasCaso.estadoComentario, "pendiente")))
      .returning({ id: resenasCaso.id });
    if (!moderada) return false;
    await insertAuditLogEntry(tx, {
      actorId: admin.id,
      actorEmail: admin.email,
      action: "review_moderated",
      targetType: "review",
      targetId: resenaId,
      metadata: { decision },
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return true;
  });
}
