import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casos, misionProgreso, tiempoPractica, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { registrarLatido, resumenPractica } from "./servicio";

const { db, close } = createTestDb();

async function alumna(): Promise<string> {
  const [usuario] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
  return usuario.id;
}

// Viernes 23 de octubre de 2026, 15:00 en Santiago.
const VIERNES = new Date("2026-10-23T18:00:00Z");
const segundos = (base: Date, cantidad: number) => new Date(base.getTime() + cantidad * 1000);

beforeEach(async () => {
  await truncateAll(db);
});

afterAll(async () => {
  await close();
});

describe("registrarLatido", () => {
  it("suma un minuto por latido y descarta los que llegan antes de tiempo", async () => {
    const userId = await alumna();
    expect(await registrarLatido(db, userId, VIERNES)).toBe(true);
    expect(await registrarLatido(db, userId, segundos(VIERNES, 10))).toBe(false);
    expect(await registrarLatido(db, userId, segundos(VIERNES, 60))).toBe(true);
    const filas = await db.select().from(tiempoPractica);
    expect(filas).toEqual([expect.objectContaining({ dia: "2026-10-23", minutos: 2 })]);
  });

  it("anota el día en hora de Chile", async () => {
    const userId = await alumna();
    await registrarLatido(db, userId, new Date("2026-10-24T02:30:00Z"));
    const [fila] = await db.select().from(tiempoPractica);
    expect(fila.dia).toBe("2026-10-23");
  });
});

describe("resumenPractica", () => {
  it("suma solo los minutos desde el lunes", async () => {
    const userId = await alumna();
    await db.insert(tiempoPractica).values([
      { userId, dia: "2026-10-18", minutos: 30 },
      { userId, dia: "2026-10-19", minutos: 20 },
      { userId, dia: "2026-10-23", minutos: 25 },
    ]);
    expect((await resumenPractica(db, userId, VIERNES)).minutosSemana).toBe(45);
  });

  it("la racha junta la práctica y el avance en misiones", async () => {
    const userId = await alumna();
    const [caso] = await db
      .insert(casos)
      .values({ slug: "ventas", titulo: "Ventas", cargo: "Analista", empresa: "Distribuidora", entregable: "Repo", misiones: [] })
      .returning({ id: casos.id });
    await db.insert(tiempoPractica).values([
      { userId, dia: "2026-10-21", minutos: 5 },
      { userId, dia: "2026-10-23", minutos: 5 },
    ]);
    await db.insert(misionProgreso).values({ userId, casoId: caso.id, mision: "m1", actualizadoEn: new Date("2026-10-22T15:00:00Z") });
    expect(await resumenPractica(db, userId, VIERNES)).toEqual({ minutosSemana: 10, racha: 3 });
  });

  it("sin actividad, todo en cero", async () => {
    const userId = await alumna();
    expect(await resumenPractica(db, userId, VIERNES)).toEqual({ minutosSemana: 0, racha: 0 });
  });
});
