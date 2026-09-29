import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import { afterAll, describe, expect, it } from "vitest";
import { checkRateLimit, consumeLimiter, peekLimiter } from "./rate-limit";
import { createRedis, getRedis, waitForReady } from "./redis";

describe("consumeLimiter", () => {
  it("permite consumir puntos disponibles", async () => {
    const limiter = new RateLimiterMemory({ points: 2, duration: 60 });
    await expect(consumeLimiter(limiter, "ana@correo.cl")).resolves.toEqual({ allowed: true });
  });

  it("devuelve retryAfterSeconds al exceder el limite", async () => {
    const limiter = new RateLimiterMemory({ points: 1, duration: 60 });
    await consumeLimiter(limiter, "ana@correo.cl");
    const result = await consumeLimiter(limiter, "ana@correo.cl");
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("peekLimiter", () => {
  it("consulta sin gastar puntos", async () => {
    const limiter = new RateLimiterMemory({ points: 1, duration: 60 });
    await peekLimiter(limiter, "ana@correo.cl");
    await peekLimiter(limiter, "ana@correo.cl");
    await expect(consumeLimiter(limiter, "ana@correo.cl")).resolves.toEqual({ allowed: true });
  });

  it("bloquea cuando ya se gastaron todos los puntos", async () => {
    const limiter = new RateLimiterMemory({ points: 2, duration: 60 });
    await consumeLimiter(limiter, "ana@correo.cl");
    await consumeLimiter(limiter, "ana@correo.cl");
    const result = await peekLimiter(limiter, "ana@correo.cl");
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("checkRateLimit contra Redis real", () => {
  afterAll(() => getRedis().disconnect());

  it("funciona en la primera llamada del proceso, antes de que Redis termine de conectar", async () => {
    await expect(checkRateLimit("register-ip", `primera-${Date.now()}`)).resolves.toEqual({ allowed: true });
  });
});

describe("Redis caido", () => {
  it("waitForReady falla en menos de 3 segundos en vez de quedar colgado", async () => {
    const deadRedis = createRedis("redis://127.0.0.1:6390");
    deadRedis.on("error", () => {});
    const started = Date.now();
    await expect(waitForReady(deadRedis)).rejects.toThrow("redis_not_ready");
    expect(Date.now() - started).toBeLessThan(3000);
    deadRedis.disconnect();
  });

  it("consumeLimiter falla en menos de 3 segundos en vez de quedar colgado", async () => {
    const deadRedis = createRedis("redis://127.0.0.1:6390");
    deadRedis.on("error", () => {});
    const limiter = new RateLimiterRedis({ storeClient: deadRedis, keyPrefix: "rl:test", points: 5, duration: 60 });
    const started = Date.now();
    await expect(consumeLimiter(limiter, "ana@correo.cl")).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(3000);
    deadRedis.disconnect();
  });
});
