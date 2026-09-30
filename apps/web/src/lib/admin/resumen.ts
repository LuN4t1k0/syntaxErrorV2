import { and, count, eq, gte, isNull } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { preguntasProfesor, reportes, resenasCaso, solicitudesDocente, tutorPreguntas, users } from "@syntaxerror/db/schema";

export type ResumenAdmin = { usuarios: number; nuevosSemana: number; docentes: number; solicitudesPendientes: number; comentariosPendientes: number; reportesPendientes: number; preguntasSinDocente: number; preguntasTutorSemana: number };

export async function resumenAdmin(db: AppDb, ahora = new Date()): Promise<ResumenAdmin> {
  const semana = new Date(ahora.getTime() - 7 * 86_400_000);
  const total = async (consulta: Promise<{ total: number }[]>) => Number((await consulta)[0]?.total ?? 0);
  const [usuarios, nuevosSemana, docentes, solicitudesPendientes, comentariosPendientes, reportesPendientes, preguntasSinDocente, preguntasTutorSemana] = await Promise.all([
    total(db.select({ total: count() }).from(users)),
    total(db.select({ total: count() }).from(users).where(gte(users.createdAt, semana))),
    total(db.select({ total: count() }).from(users).where(eq(users.role, "teacher"))),
    total(db.select({ total: count() }).from(solicitudesDocente).where(eq(solicitudesDocente.estado, "pendiente"))),
    total(db.select({ total: count() }).from(resenasCaso).where(eq(resenasCaso.estadoComentario, "pendiente"))),
    total(db.select({ total: count() }).from(reportes).where(eq(reportes.estado, "pendiente"))),
    total(db.select({ total: count() }).from(preguntasProfesor).where(and(eq(preguntasProfesor.estado, "pendiente"), isNull(preguntasProfesor.profesorId)))),
    total(db.select({ total: count() }).from(tutorPreguntas).where(gte(tutorPreguntas.creadoEn, semana))),
  ]);
  return { usuarios, nuevosSemana, docentes, solicitudesPendientes, comentariosPendientes, reportesPendientes, preguntasSinDocente, preguntasTutorSemana };
}
