import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casos, misionProgreso, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { estadoTutor } from "./acceso";

const { db, close } = createTestDb();
beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("estadoTutor", () => {
  it("se habilita con los intentos fallidos suficientes o con la misión aprobada", async () => {
    const [ana] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
    const [caso] = await db.insert(casos).values({ slug: "ventas", titulo: "V", cargo: "A", empresa: "E", entregable: "R", misiones: [] }).returning({ id: casos.id });
    expect(await estadoTutor(db, ana.id, "ventas", "m1")).toEqual({ habilitado: false, fallidos: 0, umbral: 5 });
    await db.insert(misionProgreso).values({ userId: ana.id, casoId: caso.id, mision: "m1", fallidos: 4 });
    expect(await estadoTutor(db, ana.id, "ventas", "m1")).toEqual({ habilitado: false, fallidos: 4, umbral: 5 });
    await db.insert(misionProgreso).values({ userId: ana.id, casoId: caso.id, mision: "m3", fallidos: 5 });
    expect(await estadoTutor(db, ana.id, "ventas", "m3")).toEqual({ habilitado: true, fallidos: 5, umbral: 5 });
    await db.insert(misionProgreso).values({ userId: ana.id, casoId: caso.id, mision: "m2", estado: "aprobada" });
    expect((await estadoTutor(db, ana.id, "ventas", "m2")).habilitado).toBe(true);
    expect((await estadoTutor(db, ana.id, "otro", "m1")).habilitado).toBe(false);
  });
});
