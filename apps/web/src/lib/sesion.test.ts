import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("./auth", () => ({ auth: vi.fn(), signOut: vi.fn() }));

const { auth } = await import("./auth");
const { obtenerUsuarioActual } = await import("./sesion");
const { db, close } = createTestDb();

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("obtenerUsuarioActual", () => {
  it("lee el rol desde la base, no desde la sesión", async () => {
    const [fila] = await db.insert(users).values({ email: "ana@correo.cl", name: "Ana", role: "teacher" }).returning({ id: users.id });
    vi.mocked(auth).mockResolvedValue({ user: { id: fila.id, role: "student" }, expires: "" } as never);
    expect(await obtenerUsuarioActual(db)).toEqual({ id: fila.id, email: "ana@correo.cl", nombre: "Ana", rol: "teacher" });
  });

  it("con la cuenta eliminada devuelve null aunque la sesión siga abierta", async () => {
    const [fila] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
    vi.mocked(auth).mockResolvedValue({ user: { id: fila.id }, expires: "" } as never);
    await db.delete(users).where(eq(users.id, fila.id));
    expect(await obtenerUsuarioActual(db)).toBeNull();
  });

  it("sin sesión devuelve null", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    expect(await obtenerUsuarioActual(db)).toBeNull();
  });
});
