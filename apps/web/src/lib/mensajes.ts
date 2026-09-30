import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { mensajes, users } from "@syntaxerror/db/schema";
import { enlaceMensajes } from "@/lib/cuenta/enlaces";
import type { Encolar } from "@/lib/emails";

export type Mensaje = { id: string; asunto: string; cuerpo: string; leido: boolean; creadoEn: Date };

export async function crearMensaje(
  db: AppDb,
  entrada: { userId: string; remitenteId: string | null; reporteId?: string | null; asunto: string; cuerpo: string },
  { encolar }: { encolar: Encolar }
): Promise<string | null> {
  const [destinataria] = await db.select({ email: users.email, nombre: users.name }).from(users).where(eq(users.id, entrada.userId));
  if (!destinataria) return null;
  const [creado] = await db
    .insert(mensajes)
    .values({ ...entrada, reporteId: entrada.reporteId ?? null })
    .returning({ id: mensajes.id });
  await encolar({ tipo: "mensaje-nuevo", para: destinataria.email, nombre: destinataria.nombre, asunto: entrada.asunto, enlace: enlaceMensajes() });
  return creado.id;
}

export async function listarMensajes(db: AppDb, userId: string): Promise<Mensaje[]> {
  const filas = await db
    .select({ id: mensajes.id, asunto: mensajes.asunto, cuerpo: mensajes.cuerpo, leidoEn: mensajes.leidoEn, creadoEn: mensajes.creadoEn })
    .from(mensajes)
    .where(eq(mensajes.userId, userId))
    .orderBy(desc(mensajes.creadoEn))
    .limit(50);
  return filas.map(({ leidoEn, ...fila }) => ({ ...fila, leido: leidoEn !== null }));
}

export async function contarNoLeidos(db: AppDb, userId: string): Promise<number> {
  const [fila] = await db.select({ total: count() }).from(mensajes).where(and(eq(mensajes.userId, userId), isNull(mensajes.leidoEn)));
  return Number(fila?.total ?? 0);
}

// Idempotente: marcar dos veces conserva la primera fecha de lectura.
export async function marcarLeido(db: AppDb, userId: string, mensajeId: string): Promise<boolean> {
  const filas = await db
    .update(mensajes)
    .set({ leidoEn: sql`coalesce(${mensajes.leidoEn}, now())` })
    .where(and(eq(mensajes.id, mensajeId), eq(mensajes.userId, userId)))
    .returning({ id: mensajes.id });
  return filas.length > 0;
}
