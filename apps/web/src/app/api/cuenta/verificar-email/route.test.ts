import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { registerUser } from "@/app/api/auth/register/service";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn(), cerrarSesion: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const verificar = await import("./route");
const reenviar = await import("../reenviar-verificacion/route");
const { obtenerUsuarioId } = await import("@/lib/sesion");
const { encolarEmail } = await import("@/lib/emails");

const { db, close } = createTestDb();

function confirmar(token: unknown) {
  return verificar.POST(
    new Request("http://localhost:3000/api/cuenta/verificar-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
  );
}

beforeEach(async () => {
  await truncateAll(db);
  vi.clearAllMocks();
  vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
});
afterAll(() => close());

describe("verificación por API", () => {
  it("rechaza un token que no existe", async () => {
    const respuesta = await confirmar("x".repeat(43));
    expect(respuesta.status).toBe(400);
    expect(await respuesta.json()).toEqual({ error: "invalido" });
  });

  it("reenviar pide sesión", async () => {
    expect((await reenviar.POST()).status).toBe(401);
  });

  it("reenviar encola un enlace que después confirma la cuenta", async () => {
    const { id } = await registerUser(db, { name: "Ana", email: "ana@correo.cl", password: "clave-segura-123" });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(id);

    const respuesta = await reenviar.POST();
    expect(await respuesta.json()).toEqual({ estado: "enviado" });
    const [trabajo] = vi.mocked(encolarEmail).mock.calls[0];
    expect(trabajo.tipo).toBe("verificar-email");
    const token = "enlace" in trabajo ? new URL(trabajo.enlace).searchParams.get("token") : null;

    expect((await confirmar(token)).status).toBe(200);
  });

  it("reenviar responde 503 si no pudo encolar el email", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { id } = await registerUser(db, { name: "Ana", email: "ana@correo.cl", password: "clave-segura-123" });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(id);
    vi.mocked(encolarEmail).mockRejectedValueOnce(new Error("Redis caido"));

    const respuesta = await reenviar.POST();

    expect(respuesta.status).toBe(503);
    expect(await respuesta.json()).toEqual({ error: "cola_no_disponible" });
    expect(error).toHaveBeenCalledWith("[cuenta] no se pudo reenviar la verificación", expect.any(Error));
    error.mockRestore();
  });
});
