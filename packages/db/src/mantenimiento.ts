import { and, lt, notInArray } from "drizzle-orm";
import type { DbClient } from "./client";
import { auditLog, tutorPreguntas } from "./schema";

// Registros de derechos ARCO: se conservan por obligación legal.
export const ACCIONES_ARCO = ["data_exported", "account_deleted"] as const;

export async function purgarBitacora(db: DbClient, antesDe: Date): Promise<number> {
  const borradas = await db
    .delete(auditLog)
    .where(and(lt(auditLog.createdAt, antesDe), notInArray(auditLog.action, [...ACCIONES_ARCO])))
    .returning({ id: auditLog.id });
  return borradas.length;
}

export async function purgarPreguntasTutor(db: DbClient, antesDe: Date): Promise<number> {
  const borradas = await db.delete(tutorPreguntas).where(lt(tutorPreguntas.creadoEn, antesDe)).returning({ id: tutorPreguntas.id });
  return borradas.length;
}
