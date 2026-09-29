import IORedis from "ioredis";
import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import { describe, expect, it } from "vitest";
import { consumeLimiter } from "./rate-limit";

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

describe("consumeLimiter con Redis caido", () => {
  it("falla en menos de 3 segundos en vez de quedar colgado", async () => {
    const deadRedis = new IORedis("redis://127.0.0.1:6390", {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 500,
      lazyConnect: true,
    });
    const limiter = new RateLimiterRedis({
      storeClient: deadRedis,
      keyPrefix: "rl:test",
      points: 5,
      duration: 60,
    });

    const started = Date.now();
    await expect(consumeLimiter(limiter, "ana@correo.cl")).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(3000);
    deadRedis.disconnect();
  });
});
