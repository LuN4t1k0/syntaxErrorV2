import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { AppDb, DbClient } from "@syntaxerror/db/client";
import { casoInscripciones, casos, entregables, misionProgreso, rutaCasos, rutaInscripciones } from "@syntaxerror/db/schema";
import type { IntentoTarea } from "./esquemas";

export type CodigoErrorProgreso = "caso_no_existe" | "mision_no_existe" | "tarea_no_existe";

export class ErrorProgreso extends Error {
  constructor(readonly codigo: CodigoErrorProgreso) {
    super(codigo);
    this.name = "ErrorProgreso";
  }
}

export type EstadoMision = { estado: "en_curso" | "aprobada"; tareasAprobadas: string[] };
export type ProgresoCaso = { misiones: Record<string, EstadoMision>; entregable: string | null; completo: boolean };
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
  const [entregable] = await tx.select({ id: entregables.id }).from(entregables).where(and(eq(entregables.userId, userId), eq(entregables.casoId, caso.id)));
  const completo = caso.misiones.length > 0 && caso.misiones.every((mision) => slugsAprobados.has(mision.slug)) && Boolean(entregable);
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

export async function registrarIntento(db: AppDb, userId: string, intento: IntentoTarea): Promise<{ misionAprobada: boolean; casoCompleto: boolean }> {
  return db.transaction(async (tx) => {
    const caso = await buscarCaso(tx, intento.caso);
    const mision = caso.misiones.find((candidata) => candidata.slug === intento.mision);
    if (!mision) throw new ErrorProgreso("mision_no_existe");
    if (!mision.tareas.includes(intento.tarea)) throw new ErrorProgreso("tarea_no_existe");
    await inscribir(tx, userId, caso.id);
    const clave = and(eq(misionProgreso.userId, userId), eq(misionProgreso.casoId, caso.id), eq(misionProgreso.mision, mision.slug));
    await tx.insert(misionProgreso).values({ userId, casoId: caso.id, mision: mision.slug }).onConflictDoNothing();
    const [fila] = await tx.select().from(misionProgreso).where(clave).for("update");
    const tareas = intento.aprobada && !fila.tareasAprobadas.includes(intento.tarea) ? [...fila.tareasAprobadas, intento.tarea] : fila.tareasAprobadas;
    const aprobada = mision.tareas.every((tarea) => tareas.includes(tarea));
    const ahora = new Date();
    await tx
      .update(misionProgreso)
      .set({ intentos: fila.intentos + 1, tareasAprobadas: tareas, estado: aprobada ? "aprobada" : "en_curso", aprobadaEn: aprobada ? (fila.aprobadaEn ?? ahora) : null, actualizadoEn: ahora })
      .where(clave);
    return { misionAprobada: aprobada, casoCompleto: await actualizarCompletitud(tx, userId, caso) };
  });
}

export async function guardarEntregable(db: AppDb, userId: string, entrada: { caso: string; url: string }): Promise<{ casoCompleto: boolean }> {
  return db.transaction(async (tx) => {
    const caso = await buscarCaso(tx, entrada.caso);
    await inscribir(tx, userId, caso.id);
    await tx.insert(entregables).values({ userId, casoId: caso.id, url: entrada.url }).onConflictDoUpdate({ target: [entregables.userId, entregables.casoId], set: { url: entrada.url, actualizadoEn: new Date() } });
    return { casoCompleto: await actualizarCompletitud(tx, userId, caso) };
  });
}

export async function obtenerProgresoCaso(db: AppDb, userId: string, slug: string): Promise<ProgresoCaso | null> {
  const [caso] = await db.select({ id: casos.id }).from(casos).where(eq(casos.slug, slug));
  if (!caso) return null;
  const [filas, [entregable], [inscripcion]] = await Promise.all([
    db.select({ mision: misionProgreso.mision, estado: misionProgreso.estado, tareasAprobadas: misionProgreso.tareasAprobadas }).from(misionProgreso).where(and(eq(misionProgreso.userId, userId), eq(misionProgreso.casoId, caso.id))),
    db.select({ url: entregables.url }).from(entregables).where(and(eq(entregables.userId, userId), eq(entregables.casoId, caso.id))),
    db.select({ completadoEn: casoInscripciones.completadoEn }).from(casoInscripciones).where(and(eq(casoInscripciones.userId, userId), eq(casoInscripciones.casoId, caso.id))),
  ]);
  return {
    misiones: Object.fromEntries(filas.map((fila) => [fila.mision, { estado: fila.estado === "aprobada" ? "aprobada" : "en_curso", tareasAprobadas: fila.tareasAprobadas }])),
    entregable: entregable?.url ?? null,
    completo: Boolean(inscripcion?.completadoEn),
  };
}

export async function sincronizarIntentos(db: AppDb, userId: string, intentos: IntentoTarea[]): Promise<{ aplicados: number; rechazados: number }> {
  let aplicados = 0;
  let rechazados = 0;
  for (const intento of intentos) {
    try {
      await registrarIntento(db, userId, intento);
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
