import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { cambiarOrdenLibreParaTodos } from "@/lib/ajustes";
import { SIN_META } from "@/lib/cuenta/meta";
import { tieneOrdenLibre } from "./orden";

const { db, close } = createTestDb();

beforeEach(async () => {
  await truncateAll(db);
});
afterAll(() => close());

describe("tieneOrdenLibre", () => {
  it("solo los probadores, salvo que el orden libre esté encendido para todos", async () => {
    const [estudiante, probador, admin] = await db
      .insert(users)
      .values([{ email: "ana@correo.cl" }, { email: "beto@correo.cl", probador: true }, { email: "admin@correo.cl", role: "admin" }])
      .returning({ id: users.id, email: users.email });
    expect(await tieneOrdenLibre(db, estudiante.id)).toBe(false);
    expect(await tieneOrdenLibre(db, probador.id)).toBe(true);

    await cambiarOrdenLibreParaTodos(db, { admin, activo: true }, SIN_META);
    expect(await tieneOrdenLibre(db, estudiante.id)).toBe(true);
  });
});
