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
    const m1 = { slug: "m1", sinGuia: false };
    expect(await estadoTutor(db, ana.id, "ventas", m1)).toEqual({ habilitado: false, fallidos: 0, umbral: 3 });
    await db.insert(misionProgreso).values({ userId: ana.id, casoId: caso.id, mision: "m1", fallidos: 3 });
    expect(await estadoTutor(db, ana.id, "ventas", m1)).toEqual({ habilitado: true, fallidos: 3, umbral: 3 });
    expect(await estadoTutor(db, ana.id, "ventas", { slug: "m1", sinGuia: true })).toEqual({ habilitado: false, fallidos: 3, umbral: 5 });
    await db.insert(misionProgreso).values({ userId: ana.id, casoId: caso.id, mision: "m2", estado: "aprobada" });
    expect((await estadoTutor(db, ana.id, "ventas", { slug: "m2", sinGuia: true })).habilitado).toBe(true);
    expect((await estadoTutor(db, ana.id, "otro", m1)).habilitado).toBe(false);
  });
});
