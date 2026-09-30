import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn(), cerrarSesion: vi.fn() }));

const { PATCH } = await import("./route");
const { obtenerUsuarioId } = await import("@/lib/sesion");
const { db, close } = createTestDb();

function guardar(cuerpo: unknown) {
  return PATCH(
    new Request("http://localhost:3000/api/cuenta/portafolio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    })
  );
}

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
});
afterAll(() => close());

describe("PATCH /api/cuenta/portafolio", () => {
  it("pide sesión", async () => {
    expect((await guardar({ publico: true, usuario: "ana-rojas" })).status).toBe(401);
  });

  it("publica el portafolio y responde 409 si el usuario ya es de otra cuenta", async () => {
    const [ana, otra] = await db
      .insert(users)
      .values([{ email: "ana@correo.cl" }, { email: "otra@correo.cl" }])
      .returning({ id: users.id });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(ana.id);
    expect(await (await guardar({ publico: true, usuario: "ana-rojas" })).json()).toEqual({ ok: true, usuario: "ana-rojas" });

    vi.mocked(obtenerUsuarioId).mockResolvedValue(otra.id);
    expect((await guardar({ publico: true, usuario: "ana-rojas" })).status).toBe(409);
  });
});
