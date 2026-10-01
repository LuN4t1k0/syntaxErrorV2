import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casoInscripciones, casos, rutaCasos, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { casoPendiente, casosRequeridos } from "./requisitos";

const { db, close } = createTestDb();
const PUBLICADAS = { incluirBorradores: false };

async function escenario() {
  const [ana] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
  const nuevos = await db
    .insert(casos)
    .values(["oficio", "planillas", "sql", "suelto"].map((slug) => ({ slug, titulo: slug.toUpperCase(), cargo: "A", empresa: "E", entregable: "R", misiones: [] })))
    .returning({ id: casos.id, slug: casos.slug });
  const id = (slug: string) => nuevos.find((caso) => caso.slug === slug)!.id;
  const [analista, borrador] = await db
    .insert(rutas)
    .values([
      { slug: "analista", titulo: "Analista", cargo: "A", descripcion: "R", estado: "publicada" },
      { slug: "otra", titulo: "Otra", cargo: "A", descripcion: "R", estado: "borrador" },
    ])
    .returning({ id: rutas.id });
  await db.insert(rutaCasos).values([
    { rutaId: analista.id, casoId: id("oficio"), orden: 0 },
    { rutaId: analista.id, casoId: id("planillas"), orden: 1 },
    { rutaId: analista.id, casoId: id("sql"), orden: 2 },
    { rutaId: borrador.id, casoId: id("suelto"), orden: 0 },
    { rutaId: borrador.id, casoId: id("oficio"), orden: 1 },
  ]);
  return { userId: ana.id, id };
}

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("requisitos entre casos", () => {
  it("un caso requiere el anterior de cada ruta visible, no toda la cadena", async () => {
    const { id } = await escenario();
    expect(await casosRequeridos(db, id("oficio"), PUBLICADAS)).toEqual([]);
    expect((await casosRequeridos(db, id("sql"), PUBLICADAS)).map((caso) => caso.slug)).toEqual(["planillas"]);
    expect((await casosRequeridos(db, id("oficio"), { incluirBorradores: true })).map((caso) => caso.slug)).toEqual(["suelto"]);
  });

  it("casoPendiente devuelve el caso anterior sin completar, o null", async () => {
    const { userId, id } = await escenario();
    expect(await casoPendiente(db, userId, id("planillas"), PUBLICADAS)).toEqual({ slug: "oficio", titulo: "OFICIO" });
    await db.insert(casoInscripciones).values({ userId, casoId: id("oficio") });
    expect(await casoPendiente(db, userId, id("planillas"), PUBLICADAS)).toEqual({ slug: "oficio", titulo: "OFICIO" });
    await db.update(casoInscripciones).set({ completadoEn: new Date() });
    expect(await casoPendiente(db, userId, id("planillas"), PUBLICADAS)).toBeNull();
    expect(await casoPendiente(db, userId, id("oficio"), PUBLICADAS)).toBeNull();
  });
});
