import { describe, expect, it, vi } from "vitest";

process.env.REDIS_URL = "redis://127.0.0.1:6390";
const { checkRateLimit, peekRateLimit, recordRateLimitFailure, resetRateLimit } = await import("./rate-limit");

describe("rate limit con Redis caído", () => {
  it("deja pasar en menos de 3 segundos y lo avisa en el log", async () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    const inicio = Date.now();
    expect(await checkRateLimit("register-ip", "10.0.0.1")).toEqual({ allowed: true });
    expect(Date.now() - inicio).toBeLessThan(3_000);
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining("[rate-limit] Redis no responde"), expect.anything());
    aviso.mockRestore();
  }, 10_000);

  it("consultar, registrar fallos y limpiar tampoco fallan", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await peekRateLimit("login-email", "ana@correo.cl")).toEqual({ allowed: true });
    await expect(recordRateLimitFailure("login-email", "ana@correo.cl")).resolves.toBeUndefined();
    await expect(resetRateLimit("login-email", "ana@correo.cl")).resolves.toBeUndefined();
  }, 15_000);
});
