import { count, desc, eq, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { AppDb } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { casos, preguntasProfesor, tutorCache, tutorPreguntas, users } from "@syntaxerror/db/schema";
import type { MetaRequest } from "@/lib/cuenta/meta";
import { armarPagina, desplazamiento, TAMANO_PAGINA, type Pagina } from "./paginacion";
import type { Admin } from "./usuarios";

export const ESTADOS_TUTOR = ["pendiente", "respondida", "desde_cache", "fuera_de_tema", "error"] as const;
export type EstadoPreguntaTutor = (typeof ESTADOS_TUTOR)[number];
type CasoCorto = { slug: string; titulo: string };
export type FilaPreguntaAdmin = { id: string; estudiante: string; docente: string | null; caso: CasoCorto; mision: string; texto: string; respuesta: string | null; estado: string; creadaEn: Date };
export type FilaPreguntaTutor = { id: string; estudiante: string; caso: CasoCorto; mision: string; pregunta: string; respuesta: string | null; estado: string; creadoEn: Date };
export type FilaCacheTutor = { id: string; caso: CasoCorto; mision: string; pregunta: string; respuesta: string; creadoEn: Date };

export async function listarPreguntasDocentes(db: AppDb, { estado, pagina }: { estado?: "pendiente" | "respondida"; pagina: number }): Promise<Pagina<FilaPreguntaAdmin>> {
  const docente = alias(users, "docente");
  const filtro: SQL | undefined = estado ? eq(preguntasProfesor.estado, estado) : undefined;
  const [filas, [conteo]] = await Promise.all([
    db.select({ id: preguntasProfesor.id, estudianteNombre: users.name, estudianteEmail: users.email, docenteNombre: docente.name, docenteEmail: docente.email, casoSlug: casos.slug, casoTitulo: casos.titulo, mision: preguntasProfesor.mision, texto: preguntasProfesor.texto, respuesta: preguntasProfesor.respuesta, estado: preguntasProfesor.estado, creadaEn: preguntasProfesor.creadaEn }).from(preguntasProfesor).innerJoin(users, eq(users.id, preguntasProfesor.alumnoId)).innerJoin(casos, eq(casos.id, preguntasProfesor.casoId)).leftJoin(docente, eq(docente.id, preguntasProfesor.profesorId)).where(filtro).orderBy(desc(preguntasProfesor.creadaEn)).limit(TAMANO_PAGINA).offset(desplazamiento(pagina)),
    db.select({ total: count() }).from(preguntasProfesor).where(filtro),
  ]);
  return armarPagina(filas.map((fila) => ({ id: fila.id, estudiante: fila.estudianteNombre ?? fila.estudianteEmail, docente: fila.docenteEmail ? (fila.docenteNombre ?? fila.docenteEmail) : null, caso: { slug: fila.casoSlug, titulo: fila.casoTitulo }, mision: fila.mision, texto: fila.texto, respuesta: fila.respuesta, estado: fila.estado, creadaEn: fila.creadaEn })), Number(conteo?.total ?? 0), pagina);
}

export async function listarPreguntasTutor(db: AppDb, { estado, pagina }: { estado?: EstadoPreguntaTutor; pagina: number }): Promise<Pagina<FilaPreguntaTutor>> {
  const filtro: SQL | undefined = estado ? eq(tutorPreguntas.estado, estado) : undefined;
  const [filas, [conteo]] = await Promise.all([
    db.select({ id: tutorPreguntas.id, nombre: users.name, email: users.email, casoSlug: casos.slug, casoTitulo: casos.titulo, mision: tutorPreguntas.mision, pregunta: tutorPreguntas.pregunta, respuesta: tutorPreguntas.respuesta, estado: tutorPreguntas.estado, creadoEn: tutorPreguntas.creadoEn }).from(tutorPreguntas).innerJoin(users, eq(users.id, tutorPreguntas.userId)).innerJoin(casos, eq(casos.id, tutorPreguntas.casoId)).where(filtro).orderBy(desc(tutorPreguntas.creadoEn)).limit(TAMANO_PAGINA).offset(desplazamiento(pagina)),
    db.select({ total: count() }).from(tutorPreguntas).where(filtro),
  ]);
  return armarPagina(filas.map(({ nombre, email, casoSlug, casoTitulo, ...fila }) => ({ ...fila, estudiante: nombre ?? email, caso: { slug: casoSlug, titulo: casoTitulo } })), Number(conteo?.total ?? 0), pagina);
}

export async function listarCacheTutor(db: AppDb, { casoSlug, pagina }: { casoSlug?: string; pagina: number }): Promise<Pagina<FilaCacheTutor>> {
  const filtro: SQL | undefined = casoSlug ? eq(casos.slug, casoSlug) : undefined;
  const [filas, [conteo]] = await Promise.all([
    db.select({ id: tutorCache.id, casoSlug: casos.slug, casoTitulo: casos.titulo, mision: tutorCache.mision, pregunta: tutorCache.pregunta, respuesta: tutorCache.respuesta, creadoEn: tutorCache.creadoEn }).from(tutorCache).innerJoin(casos, eq(casos.id, tutorCache.casoId)).where(filtro).orderBy(desc(tutorCache.creadoEn)).limit(TAMANO_PAGINA).offset(desplazamiento(pagina)),
    db.select({ total: count() }).from(tutorCache).innerJoin(casos, eq(casos.id, tutorCache.casoId)).where(filtro),
  ]);
  return armarPagina(filas.map(({ casoSlug, casoTitulo, ...fila }) => ({ ...fila, caso: { slug: casoSlug, titulo: casoTitulo } })), Number(conteo?.total ?? 0), pagina);
}

export async function borrarRespuestaCache(db: AppDb, { id, admin }: { id: string; admin: Admin }, meta: MetaRequest): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [entrada] = await tx.select({ pregunta: tutorCache.pregunta, mision: tutorCache.mision, caso: casos.slug }).from(tutorCache).innerJoin(casos, eq(casos.id, tutorCache.casoId)).where(eq(tutorCache.id, id));
    if (!entrada) return false;
    const borradas = await tx.delete(tutorCache).where(eq(tutorCache.id, id)).returning({ id: tutorCache.id });
    if (borradas.length === 0) return false;
    await insertAuditLogEntry(tx, { actorId: admin.id, actorEmail: admin.email, action: "tutor_cache_deleted", targetType: "tutor_cache", targetId: id, metadata: { caso: entrada.caso, mision: entrada.mision, pregunta: entrada.pregunta }, ipAddress: meta.ip, userAgent: meta.userAgent });
    return true;
  });
}
