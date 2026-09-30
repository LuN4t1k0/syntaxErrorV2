import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

const { db, close } = createTestDb();

vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }) }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const { POST } = await import("./route");
const { checkRateLimit } = await import("@/lib/rate-limit");
const { encolarSinFallar } = await import("@/lib/emails");

function post(body: unknown) {
  return POST(
    new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.9" },
      body: JSON.stringify(body),
    })
  );
}

describe("POST /api/auth/register", () => {
  beforeEach(() => truncateAll(db));
  afterAll(() => close());

  it("crea la cuenta y responde 201", async () => {
    const res = await post({ name: "Ana", email: "ana@correo.cl", password: "clave-segura-123" });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ email: "ana@correo.cl" });
  });

  it("crea la cuenta aunque no se pueda encolar la verificacion", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(encolarSinFallar).mockRejectedValueOnce(new Error("Redis caido"));

    const res = await post({ name: "Ana", email: "ana@correo.cl", password: "clave-segura-123" });

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ email: "ana@correo.cl" });
    expect(error).toHaveBeenCalledWith("[registro] no se pudo preparar la verificación", expect.any(Error));
    error.mockRestore();
  });

  it("responde 400 si la contrasena tiene menos de 8 caracteres", async () => {
    const res = await post({ name: "Ana", email: "ana@correo.cl", password: "corta" });
    expect(res.status).toBe(400);
  });

  it("responde 409 si el email ya existe, aunque cambien las mayusculas", async () => {
    await post({ name: "Ana", email: "ana@correo.cl", password: "clave-segura-123" });
    const res = await post({ name: "Ana", email: "ANA@correo.cl", password: "clave-segura-123" });
    expect(res.status).toBe(409);
  });

  it("responde 429 con Retry-After cuando se excede el limite", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 120 });
    const res = await post({ name: "Ana", email: "ana@correo.cl", password: "clave-segura-123" });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("120");
  });
});
