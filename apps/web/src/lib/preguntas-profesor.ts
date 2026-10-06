import { and, count, desc, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { casos, claseCasos, claseInscripciones, clases, preguntasProfesor, users, type MisionResumen } from "@syntaxerror/db/schema";
import { EVENTO_PREGUNTA_NUEVA, EVENTO_PREGUNTA_RESPONDIDA, salaUsuario } from "@syntaxerror/queue/eventos";
import type { Avisar } from "@/lib/avisos";
import { enlaceMisPreguntas, enlacePreguntasDocente } from "@/lib/cuenta/enlaces";
import type { MetaRequest } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import { armarPagina, desplazamiento, TAMANO_PAGINA, type Pagina } from "@/lib/admin/paginacion";
import { listarAdmins, type Persona, type Rol } from "@/lib/roles";
import type { UsuarioActual } from "@/lib/sesion";

export type DependenciasPregunta = { encolar: Encolar; avisar: Avisar };
export type FilaPregunta = {
  id: string;
  estudiante: string;
  caso: { slug: string; titulo: string };
  mision: { slug: string; titulo: string };
  texto: string;
  respuesta: string | null;
  estado: "pendiente" | "respondida";
  creadaEn: Date;
  respondidaEn: Date | null;
  asignada: boolean;
};

const describir = (persona: { nombre: string | null; email: string }) => (persona.nombre ? `${persona.nombre} (${persona.email})` : persona.email);
const tituloMision = (misiones: MisionResumen[], slug: string) => misiones.find((mision) => mision.slug === slug)?.titulo ?? slug;

// La pregunta la toma el docente de una clase activa del estudiante que tenga ese caso habilitado.
export async function resolverDocente(db: AppDb, { alumnoId, casoId }: { alumnoId: string; casoId: string }): Promise<{ claseId: string | null; profesorId: string | null }> {
  const [fila] = await db
    .select({ claseId: clases.id, profesorId: clases.profesorId })
    .from(claseInscripciones)
    .innerJoin(clases, eq(clases.id, claseInscripciones.claseId))
    .innerJoin(claseCasos, and(eq(claseCasos.claseId, clases.id), eq(claseCasos.casoId, casoId), eq(claseCasos.habilitado, true)))
    .where(and(eq(claseInscripciones.userId, alumnoId), eq(claseInscripciones.estado, "activa"), eq(clases.estado, "activa")))
    .orderBy(desc(claseInscripciones.decididaEn))
    .limit(1);
  return fila ?? { claseId: null, profesorId: null };
}

export async function crearPreguntaProfesor(
  db: AppDb,
  { alumno, casoSlug, mision, texto }: { alumno: Persona; casoSlug: string; mision: string; texto: string },
  { encolar, avisar }: DependenciasPregunta
): Promise<{ ok: true; id: string } | { ok: false; motivo: "mision_no_existe" }> {
  const [caso] = await db.select({ id: casos.id, titulo: casos.titulo, misiones: casos.misiones }).from(casos).where(eq(casos.slug, casoSlug));
  if (!caso || !caso.misiones.some((candidata) => candidata.slug === mision)) return { ok: false, motivo: "mision_no_existe" };

  const destino = await resolverDocente(db, { alumnoId: alumno.id, casoId: caso.id });
  const [creada] = await db
    .insert(preguntasProfesor)
    .values({ alumnoId: alumno.id, casoId: caso.id, mision, texto, ...destino })
    .returning({ id: preguntasProfesor.id });

  let destinatarios: Persona[] = [];
  if (destino.profesorId) {
    destinatarios = await db.select({ id: users.id, email: users.email, nombre: users.name }).from(users).where(eq(users.id, destino.profesorId));
  } else {
    destinatarios = await listarAdmins(db);
  }
  for (const persona of destinatarios) {
    await encolar({
      tipo: "pregunta-profesor-nueva",
      para: persona.email,
      nombre: persona.nombre,
      alumno: describir(alumno),
      caso: caso.titulo,
      mision: tituloMision(caso.misiones, mision),
      pregunta: texto,
      enlace: enlacePreguntasDocente(),
    });
  }
  await avisar({ salas: destinatarios.map((persona) => salaUsuario(persona.id)), evento: EVENTO_PREGUNTA_NUEVA, datos: { preguntaId: creada.id } });
  return { ok: true, id: creada.id };
}

// Responde el docente asignado. Administración puede responder cualquiera, incluidas las sin docente.
export function puedeResponder(pregunta: { profesorId: string | null }, actor: { id: string; rol: Rol }): boolean {
  return actor.rol === "admin" || (pregunta.profesorId !== null && pregunta.profesorId === actor.id);
}

export async function responderPregunta(
  db: AppDb,
  { preguntaId, respuesta, actor }: { preguntaId: string; respuesta: string; actor: UsuarioActual },
  { encolar, avisar, meta }: DependenciasPregunta & { meta: MetaRequest }
): Promise<{ ok: true } | { ok: false; motivo: "no_existe" | "prohibido" }> {
  const [pregunta] = await db
    .select({
      alumnoId: preguntasProfesor.alumnoId,
      profesorId: preguntasProfesor.profesorId,
      estado: preguntasProfesor.estado,
      texto: preguntasProfesor.texto,
      mision: preguntasProfesor.mision,
      casoTitulo: casos.titulo,
      misiones: casos.misiones,
      email: users.email,
      nombre: users.name,
    })
    .from(preguntasProfesor)
    .innerJoin(casos, eq(casos.id, preguntasProfesor.casoId))
    .innerJoin(users, eq(users.id, preguntasProfesor.alumnoId))
    .where(eq(preguntasProfesor.id, preguntaId));
  if (!pregunta || pregunta.estado !== "pendiente") return { ok: false, motivo: "no_existe" };
  if (!puedeResponder(pregunta, actor)) return { ok: false, motivo: "prohibido" };

  // Se vuelve a exigir "pendiente" al actualizar: de dos respuestas simultáneas, solo una queda.
  const respondidas = await db
    .update(preguntasProfesor)
    .set({ respuesta, estado: "respondida", respondidaEn: new Date(), respondidaPor: actor.id })
    .where(and(eq(preguntasProfesor.id, preguntaId), eq(preguntasProfesor.estado, "pendiente")))
    .returning({ id: preguntasProfesor.id });
  if (respondidas.length === 0) return { ok: false, motivo: "no_existe" };

  await insertAuditLogEntry(db, {
    actorId: actor.id,
    actorEmail: actor.email,
    action: "teacher_question_answered",
    targetType: "teacher_question",
    targetId: preguntaId,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });
  await encolar({
    tipo: "pregunta-profesor-respondida",
    para: pregunta.email,
    nombre: pregunta.nombre,
    caso: pregunta.casoTitulo,
    mision: tituloMision(pregunta.misiones, pregunta.mision),
    pregunta: pregunta.texto,
    respuesta,
    enlace: enlaceMisPreguntas(),
  });
  await avisar({ salas: [salaUsuario(pregunta.alumnoId)], evento: EVENTO_PREGUNTA_RESPONDIDA, datos: { preguntaId } });
  return { ok: true };
}

async function listar(db: AppDb, filtro: SQL | undefined, { limite = 100, desde = 0 }: { limite?: number; desde?: number } = {}): Promise<FilaPregunta[]> {
  const filas = await db
    .select({
      id: preguntasProfesor.id,
      nombre: users.name,
      email: users.email,
      casoSlug: casos.slug,
      casoTitulo: casos.titulo,
      misiones: casos.misiones,
      mision: preguntasProfesor.mision,
      texto: preguntasProfesor.texto,
      respuesta: preguntasProfesor.respuesta,
      estado: preguntasProfesor.estado,
      creadaEn: preguntasProfesor.creadaEn,
      respondidaEn: preguntasProfesor.respondidaEn,
      profesorId: preguntasProfesor.profesorId,
    })
    .from(preguntasProfesor)
    .innerJoin(users, eq(users.id, preguntasProfesor.alumnoId))
    .innerJoin(casos, eq(casos.id, preguntasProfesor.casoId))
    .where(filtro)
    .orderBy(sql`case when ${preguntasProfesor.estado} = 'pendiente' then 0 else 1 end`, desc(preguntasProfesor.creadaEn))
    .limit(limite)
    .offset(desde);
  return filas.map((fila) => ({
    id: fila.id,
    estudiante: fila.nombre ?? fila.email,
    caso: { slug: fila.casoSlug, titulo: fila.casoTitulo },
    mision: { slug: fila.mision, titulo: tituloMision(fila.misiones, fila.mision) },
    texto: fila.texto,
    respuesta: fila.respuesta,
    estado: fila.estado === "respondida" ? "respondida" : "pendiente",
    creadaEn: fila.creadaEn,
    respondidaEn: fila.respondidaEn,
    asignada: fila.profesorId !== null,
  }));
}

export function preguntasDelEstudiante(db: AppDb, alumnoId: string): Promise<FilaPregunta[]> {
  return listar(db, eq(preguntasProfesor.alumnoId, alumnoId));
}

function deDocente(actor: { id: string; rol: Rol }): SQL | undefined {
  const propias = eq(preguntasProfesor.profesorId, actor.id);
  return actor.rol === "admin" ? or(propias, isNull(preguntasProfesor.profesorId)) : propias;
}

export function preguntasParaDocente(db: AppDb, actor: { id: string; rol: Rol }): Promise<FilaPregunta[]> {
  return listar(db, deDocente(actor));
}

// El panel del docente, de 25 en 25: todas (las pendientes primero), o solo pendientes o respondidas.
export async function paginaPreguntasParaDocente(
  db: AppDb,
  actor: { id: string; rol: Rol },
  { estado, pagina }: { estado?: "pendiente" | "respondida"; pagina: number }
): Promise<Pagina<FilaPregunta>> {
  const filtro = and(deDocente(actor), estado ? eq(preguntasProfesor.estado, estado) : undefined);
  const [filas, [conteo]] = await Promise.all([
    listar(db, filtro, { limite: TAMANO_PAGINA, desde: desplazamiento(pagina) }),
    db.select({ total: count() }).from(preguntasProfesor).where(filtro),
  ]);
  return armarPagina(filas, Number(conteo?.total ?? 0), pagina);
}
