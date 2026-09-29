import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { verifyPassword } from "@/lib/password";
import { seedAdmin } from "./seed";

const { db, close } = createTestDb();

describe("seedAdmin", () => {
  beforeEach(() => truncateAll(db));
  afterAll(() => close());

  it("es idempotente: ejecutarlo dos veces deja un solo admin", async () => {
    await seedAdmin(db, { email: "Admin@Local.test", password: "admin123456" });
    await seedAdmin(db, { email: "admin@local.test", password: "admin123456" });
    const rows = await db.select().from(users);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: "admin@local.test", role: "admin" });
  });

  it("promueve a admin y actualiza la clave si el usuario ya existia", async () => {
    await db.insert(users).values({ email: "admin@local.test", role: "student", passwordHash: "x" });
    await seedAdmin(db, { email: "admin@local.test", password: "nueva-clave-123" });
    const [row] = await db.select().from(users);
    expect(row.role).toBe("admin");
    expect(await verifyPassword("nueva-clave-123", row.passwordHash!)).toBe(true);
  });
});
