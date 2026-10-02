import { fileURLToPath } from "node:url";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casos, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { release } from "./release";

const { db, close } = createTestDb();
const CONTENIDO = fileURLToPath(new URL("../../../../content", import.meta.url));
const MIGRACIONES = fileURLToPath(new URL("../../../../packages/db/drizzle", import.meta.url));
const base = { DATABASE_URL: process.env.DATABASE_URL_TEST, MIGRATIONS_DIR: MIGRACIONES, CONTENT_DIR: CONTENIDO };

describe("release", () => {
  beforeEach(() => truncateAll(db));
  afterAll(() => close());

  it("migra, sincroniza el contenido y no crea el admin si no hay clave; repetirlo deja todo igual", async () => {
    const lineas: string[] = [];
    await release(base, (linea) => lineas.push(linea));
    await release(base, (linea) => lineas.push(linea));
    expect(lineas).toEqual(["[release] migraciones aplicadas", "[release] contenido: 2 rutas, 8 casos", "[release] migraciones aplicadas", "[release] contenido: 2 rutas, 8 casos"]);
    expect(await db.select().from(rutas)).toHaveLength(2);
    expect(await db.select().from(casos)).toHaveLength(8);
    expect(await db.select().from(users)).toEqual([]);
  });

  it("con SEED_ADMIN_PASSWORD deja listo el admin", async () => {
    await release({ ...base, SEED_ADMIN_EMAIL: "admin@syntaxerror.cl", SEED_ADMIN_PASSWORD: "clave-larga-de-prueba" }, () => {});
    expect(await db.select({ email: users.email, role: users.role }).from(users)).toEqual([{ email: "admin@syntaxerror.cl", role: "admin" }]);
  });

  it("sin DATABASE_URL falla antes de tocar nada", async () => {
    await expect(release({}, () => {})).rejects.toThrow("DATABASE_URL is not set");
  });
});
