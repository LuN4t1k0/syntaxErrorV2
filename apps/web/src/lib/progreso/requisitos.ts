import { and, desc, eq, inArray, isNotNull, lt } from "drizzle-orm";
import type { DbClient } from "@syntaxerror/db/client";
import { casoInscripciones, casos, rutaCasos, rutas } from "@syntaxerror/db/schema";

export type CasoCorto = { slug: string; titulo: string };
// ordenLibre: sin bloqueos de orden (probadores, o todos si un admin lo encendió).
export type OpcionesRequisitos = { incluirBorradores: boolean; ordenLibre?: boolean };

// Solo el caso inmediatamente anterior de cada ruta visible que contiene al caso: ese, a su vez, exigió el suyo.
export async function casosRequeridos(db: DbClient, casoId: string, { incluirBorradores }: OpcionesRequisitos): Promise<(CasoCorto & { id: string })[]> {
  const posiciones = await db
    .select({ rutaId: rutaCasos.rutaId, orden: rutaCasos.orden })
    .from(rutaCasos)
    .innerJoin(rutas, eq(rutas.id, rutaCasos.rutaId))
    .where(and(eq(rutaCasos.casoId, casoId), incluirBorradores ? undefined : inArray(rutas.estado, ["publicada", "beta"])));
  const requeridos = new Map<string, CasoCorto & { id: string }>();
  for (const { rutaId, orden } of posiciones) {
    const [anterior] = await db
      .select({ id: casos.id, slug: casos.slug, titulo: casos.titulo })
      .from(rutaCasos)
      .innerJoin(casos, eq(casos.id, rutaCasos.casoId))
      .where(and(eq(rutaCasos.rutaId, rutaId), lt(rutaCasos.orden, orden)))
      .orderBy(desc(rutaCasos.orden))
      .limit(1);
    if (anterior) requeridos.set(anterior.id, anterior);
  }
  return [...requeridos.values()];
}

export async function casoPendiente(db: DbClient, userId: string, casoId: string, opciones: OpcionesRequisitos): Promise<CasoCorto | null> {
  if (opciones.ordenLibre) return null;
  const requeridos = await casosRequeridos(db, casoId, opciones);
  if (requeridos.length === 0) return null;
  const completos = await db
    .select({ casoId: casoInscripciones.casoId })
    .from(casoInscripciones)
    .where(and(eq(casoInscripciones.userId, userId), inArray(casoInscripciones.casoId, requeridos.map((caso) => caso.id)), isNotNull(casoInscripciones.completadoEn)));
  const hechos = new Set(completos.map((fila) => fila.casoId));
  const pendiente = requeridos.find((caso) => !hechos.has(caso.id));
  return pendiente ? { slug: pendiente.slug, titulo: pendiente.titulo } : null;
}
