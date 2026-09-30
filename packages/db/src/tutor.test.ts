import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casos } from "./schema";
import { createTestDb, truncateAll } from "./testing";
import { buscarRespuestaEnCache, guardarRespuestaEnCache } from "./tutor";

const { db, close } = createTestDb();

function eje(indice: number, extra: Record<number, number> = {}): number[] {
  const vector = new Array<number>(768).fill(0);
  vector[indice] = 1;
  for (const [posicion, valor] of Object.entries(extra)) vector[Number(posicion)] = valor;
  return vector;
}

async function crearCaso(): Promise<string> {
  const [caso] = await db
    .insert(casos)
    .values({ slug: "ventas", titulo: "Ventas", cargo: "Analista", empresa: "Distribuidora", entregable: "Repo", misiones: [] })
    .returning({ id: casos.id });
  return caso.id;
}

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("caché del tutor", () => {
  it("encuentra la respuesta de una pregunta casi igual en la misma misión", async () => {
    const casoId = await crearCaso();
    await guardarRespuestaEnCache(db, { casoId, mision: "m1", pregunta: "¿Cómo filtro?", respuesta: "Usa WHERE.", embedding: eje(0) });
    expect(await buscarRespuestaEnCache(db, { casoId, mision: "m1", embedding: eje(0, { 1: 0.1 }) })).toBe("Usa WHERE.");
  });

  it("no mezcla preguntas distintas ni otras misiones", async () => {
    const casoId = await crearCaso();
    await guardarRespuestaEnCache(db, { casoId, mision: "m1", pregunta: "¿Cómo filtro?", respuesta: "Usa WHERE.", embedding: eje(0) });
    expect(await buscarRespuestaEnCache(db, { casoId, mision: "m1", embedding: eje(1) })).toBeNull();
    expect(await buscarRespuestaEnCache(db, { casoId, mision: "m2", embedding: eje(0) })).toBeNull();
  });
});
