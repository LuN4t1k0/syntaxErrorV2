import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { refrescarToken } from "./sesion-token";

const { db, close } = createTestDb();
beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("refrescarToken", () => {
  it("toma el rol vigente desde la base", async () => {
    const [fila] = await db.insert(users).values({ email: "ana@correo.cl", role: "teacher" }).returning({ id: users.id });
    expect(await refrescarToken(db, { sub: fila.id, role: "student", email: "ana@correo.cl" })).toEqual({
      sub: fila.id,
      role: "teacher",
      email: "ana@correo.cl",
    });
  });

  it("si la cuenta ya no existe, la sesión se descarta", async () => {
    const [fila] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
    await db.delete(users).where(eq(users.id, fila.id));
    expect(await refrescarToken(db, { sub: fila.id, role: "student" })).toBeNull();
  });

  it("un token sin usuario queda igual", async () => {
    expect(await refrescarToken(db, { name: "x" })).toEqual({ name: "x" });
  });
});
