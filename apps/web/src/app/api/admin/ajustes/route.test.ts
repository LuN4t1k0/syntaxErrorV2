import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { ordenLibreParaTodos } from "@/lib/ajustes";
import type { Rol } from "@/lib/roles";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));

const { PATCH } = await import("./route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

async function persona(email: string, rol: Rol) {
  const [fila] = await db.insert(users).values({ email, role: rol }).returning({ id: users.id });
  return { id: fila.id, email, nombre: null, rol };
}

const cambiar = (cuerpo: unknown) =>
  PATCH(new Request("http://localhost:3000/api/admin/ajustes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }));

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
});
afterAll(() => close());

describe("PATCH /api/admin/ajustes", () => {
  it("solo administración enciende y apaga el orden libre para todos", async () => {
    expect((await cambiar({ ordenLibre: true })).status).toBe(401);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("rosa@correo.cl", "teacher"));
    expect((await cambiar({ ordenLibre: true })).status).toBe(403);

    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("admin@correo.cl", "admin"));
    expect((await cambiar({ ordenLibre: "si" })).status).toBe(400);
    expect((await cambiar({ ordenLibre: true })).status).toBe(200);
    expect(await ordenLibreParaTodos(db)).toBe(true);
    expect((await cambiar({ ordenLibre: false })).status).toBe(200);
    expect(await ordenLibreParaTodos(db)).toBe(false);
  });
});
