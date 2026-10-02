import { and, desc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import type { AppDb, DbClient } from "@syntaxerror/db/client";
import { casoInscripciones, casos, entregables, misionProgreso, rutaCasos, rutaInscripciones } from "@syntaxerror/db/schema";
import { parsearRepositorio, urlRepositorio, type Verificador } from "@/lib/entregables/github";
import type { Observaciones, Puntajes } from "@/lib/entregables/rubrica";
import { CLAVE_CASO, otorgarPuntos, PUNTOS } from "@/lib/puntos/servicio";
import type { IntentoTarea } from "./esquemas";
import { casoPendiente, type CasoCorto, type OpcionesRequisitos } from "./requisitos";

export type CodigoErrorProgreso =
  | "caso_no_existe"
  | "mision_no_existe"
  | "tarea_no_existe"
  | "mision_bloqueada"
  | "caso_bloqueado"
  | "misiones_pendientes"
  | "entregable_aprobado";

const SOLO_PUBLICADAS: OpcionesRequisitos = { incluirBorradores: false };

export function estadoHttp(codigo: CodigoErrorProgreso): 404 | 409 {
  return codigo.endsWith("_no_existe") ? 404 : 409;
}

export class ErrorProgreso extends Error {
  constructor(readonly codigo: CodigoErrorProgreso) {
    super(codigo);
    this.name = "ErrorProgreso";
  }
}

export type EstadoMision = { estado: "en_curso" | "aprobada"; tareasAprobadas: string[]; fallidos: number };
// Lo que la persona ve de la revisión: el estado, el puntaje de cada dimensión, sus comentarios y el comentario general.
export type RevisionEntregable = { estado: "pendiente" | "aprobado" | "observado"; puntajes: Puntajes; observaciones: Observaciones; comentario: string | null };
export type ProgresoCaso = { misiones: Record<string, EstadoMision>; entregable: string | null; revision: RevisionEntregable | null; completo: boolean; bloqueadoPor: CasoCorto | null };
export type ResultadoEntrega = { estado: "en_revision" } | { estado: "no_verificado"; problemas: string[]; reintentable: boolean };
export type CasoDelUsuario = { slug: string; titulo: string; misionesAprobadas: number; totalMisiones: number; completo: boolean };

type CasoGuardado = typeof casos.$inferSelect;

async function buscarCaso(db: DbClient, slug: string): Promise<CasoGuardado> {
  const [caso] = await db.select().from(casos).where(eq(casos.slug, slug));
  if (!caso) throw new ErrorProgreso("caso_no_existe");
  return caso;
}

async function inscribir(tx: DbClient, userId: string, casoId: string): Promise<void> {
  await tx.insert(casoInscripciones).values({ userId, casoId }).onConflictDoNothing();
  const rutasDelCaso = await tx.select({ rutaId: rutaCasos.rutaId }).from(rutaCasos).where(eq(rutaCasos.casoId, casoId));
  if (rutasDelCaso.length > 0) {
    await tx.insert(rutaInscripciones).values(rutasDelCaso.map(({ rutaId }) => ({ userId, rutaId }))).onConflictDoNothing();
  }
}

async function actualizarCompletitud(tx: DbClient, userId: string, caso: CasoGuardado): Promise<boolean> {
  const aprobadas = await tx
    .select({ mision: misionProgreso.mision })
    .from(misionProgreso)
    .where(and(eq(misionProgreso.userId, userId), eq(misionProgreso.casoId, caso.id), eq(misionProgreso.estado, "aprobada")));
  const slugsAprobados = new Set(aprobadas.map((fila) => fila.mision));
  const [entregable] = await tx
    .select({ estado: entregables.estado })
    .from(entregables)
    .where(and(eq(entregables.userId, userId), eq(entregables.casoId, caso.id)));
  // El caso se completa con todas las misiones aprobadas y el entregable aprobado por una persona con la rúbrica.
  const completo = caso.misiones.length > 0 && caso.misiones.every((mision) => slugsAprobados.has(mision.slug)) && entregable?.estado === "aprobado";
  if (!completo) return false;

  await tx
    .update(casoInscripciones)
    .set({ completadoEn: sql`coalesce(${casoInscripciones.completadoEn}, now())` })
    .where(and(eq(casoInscripciones.userId, userId), eq(casoInscripciones.casoId, caso.id)));

  const rutasDelCaso = await tx.select({ rutaId: rutaCasos.rutaId }).from(rutaCasos).where(eq(rutaCasos.casoId, caso.id));
  for (const { rutaId } of rutasDelCaso) {
    const casosDeRuta = await tx.select({ casoId: rutaCasos.casoId }).from(rutaCasos).where(eq(rutaCasos.rutaId, rutaId));
    const ids = casosDeRuta.map((fila) => fila.casoId);
    if (ids.length === 0) continue;
    const completos = await tx
      .select({ casoId: casoInscripciones.casoId })
      .from(casoInscripciones)
      .where(and(eq(casoInscripciones.userId, userId), inArray(casoInscripciones.casoId, ids), isNotNull(casoInscripciones.completadoEn)));
    if (completos.length === casosDeRuta.length) {
      await tx
        .update(rutaInscripciones)
        .set({ completadoEn: sql`coalesce(${rutaInscripciones.completadoEn}, now())` })
        .where(and(eq(rutaInscripciones.userId, userId), eq(rutaInscripciones.rutaId, rutaId)));
    }
  }
  return true;
}

export async function registrarIntento(db: AppDb, userId: string, intento: IntentoTarea, opciones: OpcionesRequisitos = SOLO_PUBLICADAS): Promise<{ misionAprobada: boolean; casoCompleto: boolean }> {
  return db.transaction(async (tx) => {
    const caso = await buscarCaso(tx, intento.caso);
    const mision = caso.misiones.find((candidata) => candidata.slug === intento.mision);
    if (!mision) throw new ErrorProgreso("mision_no_existe");
    if (!mision.tareas.includes(intento.tarea)) throw new ErrorProgreso("tarea_no_existe");
    // El servidor es la autoridad sobre el orden: la misión anterior aprobada y el caso anterior completo.
    const indice = caso.misiones.findIndex((candidata) => candidata.slug === mision.slug);
    if (indice > 0) {
      const [previa] = await tx
        .select({ estado: misionProgreso.estado })
        .from(misionProgreso)
        .where(and(eq(misionProgreso.userId, userId), eq(misionProgreso.casoId, caso.id), eq(misionProgreso.mision, caso.misiones[indice - 1].slug)));
      if (previa?.estado !== "aprobada") throw new ErrorProgreso("mision_bloqueada");
    }
    if (await casoPendiente(tx, userId, caso.id, opciones)) throw new ErrorProgreso("caso_bloqueado");
    await inscribir(tx, userId, caso.id);
    const clave = and(eq(misionProgreso.userId, userId), eq(misionProgreso.casoId, caso.id), eq(misionProgreso.mision, mision.slug));
    await tx.insert(misionProgreso).values({ userId, casoId: caso.id, mision: mision.slug }).onConflictDoNothing();
    const [fila] = await tx.select().from(misionProgreso).where(clave).for("update");
    const tareas = intento.aprobada && !fila.tareasAprobadas.includes(intento.tarea) ? [...fila.tareasAprobadas, intento.tarea] : fila.tareasAprobadas;
    const aprobada = mision.tareas.every((tarea) => tareas.includes(tarea));
    const ahora = new Date();
    await tx
      .update(misionProgreso)
      .set({ intentos: fila.intentos + 1, fallidos: fila.fallidos + (intento.aprobada ? 0 : 1), tareasAprobadas: tareas, estado: aprobada ? "aprobada" : "en_curso", aprobadaEn: aprobada ? (fila.aprobadaEn ?? ahora) : null, actualizadoEn: ahora })
      .where(clave);
    if (aprobada) await otorgarPuntos(tx, { userId, casoId: caso.id, clave: mision.slug, motivo: "mision_aprobada", cantidad: PUNTOS.mision });
    const casoCompleto = await actualizarCompletitud(tx, userId, caso);
    if (casoCompleto) await otorgarPuntos(tx, { userId, casoId: caso.id, clave: CLAVE_CASO, motivo: "caso_completo", cantidad: PUNTOS.caso });
    return { misionAprobada: aprobada, casoCompleto };
  });
}

export async function enviarEntregable(
  db: AppDb,
  userId: string,
  entrada: { caso: string; url: string; archivos: string[] },
  { verificar }: { verificar: Verificador },
  opciones: OpcionesRequisitos = SOLO_PUBLICADAS
): Promise<ResultadoEntrega> {
  const caso = await buscarCaso(db, entrada.caso);
  if (await casoPendiente(db, userId, caso.id, opciones)) throw new ErrorProgreso("caso_bloqueado");
  const aprobadas = await db
    .select({ mision: misionProgreso.mision })
    .from(misionProgreso)
    .where(and(eq(misionProgreso.userId, userId), eq(misionProgreso.casoId, caso.id), eq(misionProgreso.estado, "aprobada")));
  const slugs = new Set(aprobadas.map((fila) => fila.mision));
  if (caso.misiones.length === 0 || !caso.misiones.every((mision) => slugs.has(mision.slug))) throw new ErrorProgreso("misiones_pendientes");
  const [actual] = await db.select({ estado: entregables.estado }).from(entregables).where(and(eq(entregables.userId, userId), eq(entregables.casoId, caso.id)));
  if (actual?.estado === "aprobado") throw new ErrorProgreso("entregable_aprobado");

  const repositorio = parsearRepositorio(entrada.url);
  if (!repositorio) return { estado: "no_verificado", problemas: ["El enlace debe ser un repositorio de GitHub."], reintentable: false };
  const verificacion = await verificar(repositorio, { archivos: entrada.archivos });
  if (!verificacion.ok) return { estado: "no_verificado", problemas: verificacion.problemas, reintentable: verificacion.reintentable };

  const ahora = new Date();
  // Al reenviar, la revisión anterior se borra: el entregable vuelve a revisarse completo, sin penalización.
  const datos = { url: urlRepositorio(repositorio), estado: "pendiente", verificadoEn: ahora, puntajes: {}, observaciones: {}, comentario: null, revisadoPor: null, revisadoEn: null, actualizadoEn: ahora };
  await db.transaction(async (tx) => {
    await inscribir(tx, userId, caso.id);
    await tx
      .insert(entregables)
      .values({ userId, casoId: caso.id, ...datos })
      .onConflictDoUpdate({ target: [entregables.userId, entregables.casoId], set: datos, setWhere: ne(entregables.estado, "aprobado") });
  });
  return { estado: "en_revision" };
}

export async function recalcularCaso(db: AppDb, userId: string, casoSlug: string): Promise<{ casoCompleto: boolean }> {
  return db.transaction(async (tx) => {
    const caso = await buscarCaso(tx, casoSlug);
    const casoCompleto = await actualizarCompletitud(tx, userId, caso);
    if (casoCompleto) await otorgarPuntos(tx, { userId, casoId: caso.id, clave: CLAVE_CASO, motivo: "caso_completo", cantidad: PUNTOS.caso });
    return { casoCompleto };
  });
}

export async function obtenerProgresoCaso(db: AppDb, userId: string, slug: string, opciones: OpcionesRequisitos = SOLO_PUBLICADAS): Promise<ProgresoCaso | null> {
  const [caso] = await db.select({ id: casos.id }).from(casos).where(eq(casos.slug, slug));
  if (!caso) return null;
  const [filas, [entregable], [inscripcion], bloqueadoPor] = await Promise.all([
    db.select({ mision: misionProgreso.mision, estado: misionProgreso.estado, tareasAprobadas: misionProgreso.tareasAprobadas, fallidos: misionProgreso.fallidos }).from(misionProgreso).where(and(eq(misionProgreso.userId, userId), eq(misionProgreso.casoId, caso.id))),
    db
      .select({ url: entregables.url, estado: entregables.estado, puntajes: entregables.puntajes, observaciones: entregables.observaciones, comentario: entregables.comentario })
      .from(entregables).where(and(eq(entregables.userId, userId), eq(entregables.casoId, caso.id))),
    db.select({ completadoEn: casoInscripciones.completadoEn }).from(casoInscripciones).where(and(eq(casoInscripciones.userId, userId), eq(casoInscripciones.casoId, caso.id))),
    casoPendiente(db, userId, caso.id, opciones),
  ]);
  return {
    misiones: Object.fromEntries(filas.map((fila) => [fila.mision, { estado: fila.estado === "aprobada" ? "aprobada" : "en_curso", tareasAprobadas: fila.tareasAprobadas, fallidos: fila.fallidos }])),
    entregable: entregable?.url ?? null,
    revision: entregable
      ? { estado: entregable.estado as RevisionEntregable["estado"], puntajes: entregable.puntajes, observaciones: entregable.observaciones, comentario: entregable.comentario }
      : null,
    completo: Boolean(inscripcion?.completadoEn),
    bloqueadoPor,
  };
}

export async function sincronizarIntentos(db: AppDb, userId: string, intentos: IntentoTarea[], opciones: OpcionesRequisitos = SOLO_PUBLICADAS): Promise<{ aplicados: number; rechazados: number }> {
  let aplicados = 0;
  let rechazados = 0;
  for (const intento of intentos) {
    try {
      await registrarIntento(db, userId, intento, opciones);
      aplicados += 1;
    } catch (error) {
      if (!(error instanceof ErrorProgreso)) throw error;
      rechazados += 1;
    }
  }
  return { aplicados, rechazados };
}

export async function listarCasosDelUsuario(db: AppDb, userId: string): Promise<CasoDelUsuario[]> {
  const inscritos = await db
    .select({ casoId: casos.id, slug: casos.slug, titulo: casos.titulo, misiones: casos.misiones, completadoEn: casoInscripciones.completadoEn })
    .from(casoInscripciones)
    .innerJoin(casos, eq(casos.id, casoInscripciones.casoId))
    .where(eq(casoInscripciones.userId, userId))
    .orderBy(desc(casoInscripciones.inscritoEn));
  if (inscritos.length === 0) return [];
  const aprobadas = await db.select({ casoId: misionProgreso.casoId, mision: misionProgreso.mision }).from(misionProgreso).where(and(eq(misionProgreso.userId, userId), eq(misionProgreso.estado, "aprobada")));
  return inscritos.map((caso) => ({
    slug: caso.slug,
    titulo: caso.titulo,
    totalMisiones: caso.misiones.length,
    misionesAprobadas: aprobadas.filter((fila) => fila.casoId === caso.casoId && caso.misiones.some((mision) => mision.slug === fila.mision)).length,
    completo: caso.completadoEn !== null,
  }));
}
