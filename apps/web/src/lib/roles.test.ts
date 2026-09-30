import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { esDocente, esRol, listarAdmins } from "./roles";

const { db, close } = createTestDb();
beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("roles", () => {
  it("reconoce los tres roles y trata a teacher y admin como docentes", () => {
    expect(esRol("teacher")).toBe(true);
    expect(esRol("superadmin")).toBe(false);
    expect(esDocente({ rol: "student" })).toBe(false);
    expect(esDocente({ rol: "teacher" })).toBe(true);
    expect(esDocente({ rol: "admin" })).toBe(true);
  });

  it("listarAdmins devuelve solo las cuentas de administración", async () => {
    await db.insert(users).values([
      { email: "admin@correo.cl", name: "Admin", role: "admin" },
      { email: "ana@correo.cl", name: "Ana" },
    ]);
    expect(await listarAdmins(db)).toEqual([{ id: expect.any(String), email: "admin@correo.cl", nombre: "Admin" }]);
  });
});
