import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { registerUser } from "@/app/api/auth/register/service";

vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const recuperar = await import("./route");
const restablecer = await import("../restablecer/route");
const { encolarSinFallar } = await import("@/lib/emails");
const { db, close } = createTestDb();

function pedir(cuerpo: unknown) {
  return new Request("http://localhost:3000/api/cuenta/recuperar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
    },
    body: JSON.stringify(cuerpo),
  });
}

beforeEach(async () => {
  await truncateAll(db);
  vi.clearAllMocks();
});
afterAll(() => close());

describe("recuperar y restablecer por API", () => {
  it("responde lo mismo exista o no la cuenta, y solo envía a la que existe", async () => {
    const email = `ana-${Date.now()}@correo.cl`;
    await registerUser(db, { name: "Ana", email, password: "clave-segura-123" });

    const existe = await recuperar.POST(pedir({ email }));
    const noExiste = await recuperar.POST(pedir({ email: `nadie-${Date.now()}@correo.cl` }));
    expect([existe.status, await existe.json()]).toEqual([200, { ok: true }]);
    expect([noExiste.status, await noExiste.json()]).toEqual([200, { ok: true }]);
    expect(encolarSinFallar).toHaveBeenCalledTimes(1);
  });

  it("restablecer: 400 con un token inválido o una clave corta, 200 con el enlace del email", async () => {
    const email = `ana-${Date.now()}@correo.cl`;
    await registerUser(db, { name: "Ana", email, password: "clave-segura-123" });
    await recuperar.POST(pedir({ email }));
    const [trabajo] = vi.mocked(encolarSinFallar).mock.calls[0];
    const token = "enlace" in trabajo ? new URL(trabajo.enlace).searchParams.get("token") : null;

    const enviar = (cuerpo: unknown) =>
      restablecer.POST(
        new Request("http://localhost:3000/api/cuenta/restablecer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpo),
        })
      );
    expect((await enviar({ token: "z".repeat(43), claveNueva: "nueva-clave-789" })).status).toBe(400);
    expect((await enviar({ token, claveNueva: "corta" })).status).toBe(400);
    expect((await enviar({ token, claveNueva: "nueva-clave-789" })).status).toBe(200);
  });
});
