import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { verifyPassword } from "@/lib/password";
import { normalizeEmail, registerUser } from "./service";

const { db, close } = createTestDb();

describe("registerUser", () => {
  beforeEach(() => truncateAll(db));
  afterAll(() => close());

  it("crea la alumna con la contrasena hasheada y rol student", async () => {
    const created = await registerUser(db, { name: "Ana", email: "ana@correo.cl", password: "clave-segura-123" });
    const [row] = await db.select().from(users).where(eq(users.id, created.id));
    expect(row.role).toBe("student");
    expect(row.passwordHash).not.toBe("clave-segura-123");
    expect(await verifyPassword("clave-segura-123", row.passwordHash!)).toBe(true);
  });

  it("normaliza el email y rechaza el duplicado", async () => {
    const created = await registerUser(db, { name: "Ana", email: "  Ana@Correo.CL ", password: "clave-segura-123" });
    expect(created.email).toBe("ana@correo.cl");
    await expect(
      registerUser(db, { name: "Otra", email: "ana@correo.cl", password: "clave-segura-456" })
    ).rejects.toThrow("email_taken");
  });

  it("normalizeEmail recorta y pasa a minusculas", () => {
    expect(normalizeEmail("  Ana@Correo.CL ")).toBe("ana@correo.cl");
  });
});
