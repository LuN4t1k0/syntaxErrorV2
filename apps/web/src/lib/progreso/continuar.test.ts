import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casoInscripciones, casos, misionProgreso, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { siguientePaso } from "./continuar";

const { db, close } = createTestDb();
const MISIONES = [
  { slug: "m1", titulo: "Uno", tareas: ["t1"] },
  { slug: "m2", titulo: "Dos", tareas: ["t1"] },
  { slug: "m3", titulo: "Tres", tareas: ["t1"] },
];
const hace = (minutos: number) => new Date(Date.now() - minutos * 60_000);

async function preparar() {
  const [ana] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
  const [ventas, stock] = await db
    .insert(casos)
    .values([
      { slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "D", entregable: "R", misiones: MISIONES },
      { slug: "stock", titulo: "Stock", cargo: "A", empresa: "D", entregable: "R", misiones: MISIONES },
    ])
    .returning({ id: casos.id });
  return { userId: ana.id, ventasId: ventas.id, stockId: stock.id };
}

const TODOS = new Set(["ventas", "stock"]);

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("siguientePaso", () => {
  it("sin actividad no hay tarjeta", async () => {
    const { userId } = await preparar();
    expect(await siguientePaso(db, userId, TODOS)).toBeNull();
  });

  it("vuelve a la misión en curso más reciente", async () => {
    const { userId, ventasId } = await preparar();
    await db.insert(misionProgreso).values([
      { userId, casoId: ventasId, mision: "m1", estado: "aprobada", actualizadoEn: hace(30) },
      { userId, casoId: ventasId, mision: "m2", estado: "en_curso", actualizadoEn: hace(5) },
    ]);
    expect(await siguientePaso(db, userId, TODOS)).toEqual({
      tipo: "mision",
      caso: { slug: "ventas", titulo: "Ventas" },
      mision: { slug: "m2", titulo: "Dos" },
      href: "/casos/ventas/m2",
    });
  });

  it("si la última quedó aprobada, sigue con la siguiente pendiente, dando la vuelta", async () => {
    const { userId, ventasId } = await preparar();
    await db.insert(misionProgreso).values([
      { userId, casoId: ventasId, mision: "m2", estado: "aprobada", actualizadoEn: hace(20) },
      { userId, casoId: ventasId, mision: "m3", estado: "aprobada", actualizadoEn: hace(5) },
    ]);
    expect((await siguientePaso(db, userId, TODOS))?.href).toBe("/casos/ventas/m1");
  });

  it("con todas aprobadas y sin entregable, lleva al caso", async () => {
    const { userId, ventasId } = await preparar();
    await db.insert(misionProgreso).values(
      MISIONES.map((mision, indice) => ({ userId, casoId: ventasId, mision: mision.slug, estado: "aprobada" as const, actualizadoEn: hace(indice) }))
    );
    expect(await siguientePaso(db, userId, TODOS)).toEqual({ tipo: "entregable", caso: { slug: "ventas", titulo: "Ventas" }, href: "/casos/ventas" });
  });

  it("salta casos completos, casos no publicados y misiones que ya no están en el contenido", async () => {
    const { userId, ventasId, stockId } = await preparar();
    await db.insert(casoInscripciones).values({ userId, casoId: ventasId, completadoEn: new Date() });
    await db.insert(misionProgreso).values([
      { userId, casoId: ventasId, mision: "m1", estado: "aprobada", actualizadoEn: hace(1) },
      { userId, casoId: stockId, mision: "m-borrada", estado: "en_curso", actualizadoEn: hace(10) },
    ]);
    expect((await siguientePaso(db, userId, TODOS))?.href).toBe("/casos/stock/m1");
    expect(await siguientePaso(db, userId, new Set(["ventas"]))).toBeNull();
  });
});
