import { and, asc, cosineDistance, eq, lt } from "drizzle-orm";
import type { DbClient } from "./client";
import { tutorCache } from "./schema";

export const DISTANCIA_MAXIMA_CACHE = 0.12;

export async function buscarRespuestaEnCache(
  db: DbClient,
  { casoId, mision, embedding }: { casoId: string; mision: string; embedding: number[] }
): Promise<string | null> {
  const distancia = cosineDistance(tutorCache.embedding, embedding);
  const [fila] = await db
    .select({ respuesta: tutorCache.respuesta })
    .from(tutorCache)
    .where(and(eq(tutorCache.casoId, casoId), eq(tutorCache.mision, mision), lt(distancia, DISTANCIA_MAXIMA_CACHE)))
    .orderBy(asc(distancia))
    .limit(1);
  return fila?.respuesta ?? null;
}

export async function guardarRespuestaEnCache(
  db: DbClient,
  entrada: { casoId: string; mision: string; pregunta: string; respuesta: string; embedding: number[] }
): Promise<void> {
  await db.insert(tutorCache).values(entrada);
}
