import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const { GET, POST } = await import("./route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
});
afterAll(() => close());

describe("/api/docentes/solicitud", () => {
  it("sin sesión responde 401", async () => {
    expect((await GET()).status).toBe(401);
    expect((await POST()).status).toBe(401);
  });

  it("pedir acceso deja la solicitud pendiente", async () => {
    const [rosa] = await db.insert(users).values({ email: "rosa@correo.cl" }).returning({ id: users.id });
    vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: rosa.id, email: "rosa@correo.cl", nombre: null, rol: "student" });
    expect(await (await GET()).json()).toEqual({ estado: "puede_solicitar" });
    expect(await (await POST()).json()).toEqual({ estado: "pendiente" });
    expect(await (await GET()).json()).toEqual({ estado: "pendiente" });
  });
});
