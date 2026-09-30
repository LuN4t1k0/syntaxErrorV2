import { RateLimiterMemory, RateLimiterRedis, type RateLimiterRes } from "rate-limiter-flexible";
import { getRedis, waitForReady } from "./redis";

export type RateLimitKey =
  | "login-email"
  | "login-ip"
  | "register-ip"
  | "cuenta-clave"
  | "cuenta-email"
  | "reenviar-verificacion"
  | "recuperar-ip"
  | "recuperar-email";

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

type Limiter = RateLimiterRedis | RateLimiterMemory;

const LIMITER_CONFIGS: Record<RateLimitKey, { points: number; duration: number }> = {
  "login-email": { points: 5, duration: 900 },
  "login-ip": { points: 10, duration: 900 },
  "register-ip": { points: 5, duration: 3600 },
  "cuenta-clave": { points: 5, duration: 900 },
  "cuenta-email": { points: 5, duration: 3600 },
  "reenviar-verificacion": { points: 3, duration: 3600 },
  "recuperar-ip": { points: 5, duration: 3600 },
  "recuperar-email": { points: 3, duration: 3600 },
};

const limiters = new Map<RateLimitKey, RateLimiterRedis>();

async function getLimiter(key: RateLimitKey): Promise<RateLimiterRedis> {
  const redis = getRedis();
  await waitForReady(redis);
  let limiter = limiters.get(key);
  if (!limiter) {
    const config = LIMITER_CONFIGS[key];
    limiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: `rl:${key}`,
      points: config.points,
      duration: config.duration,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

export async function consumeLimiter(
  limiter: Pick<Limiter, "consume">,
  identifier: string
): Promise<RateLimitResult> {
  try {
    await limiter.consume(identifier);
    return { allowed: true };
  } catch (rejection) {
    if (rejection instanceof Error) throw rejection;
    const res = rejection as RateLimiterRes;
    return { allowed: false, retryAfterSeconds: Math.ceil(res.msBeforeNext / 1000) };
  }
}

// Consulta el estado sin gastar puntos.
export async function peekLimiter(
  limiter: Pick<Limiter, "get" | "points">,
  identifier: string
): Promise<RateLimitResult> {
  const res = await limiter.get(identifier);
  if (res && res.consumedPoints >= limiter.points) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(res.msBeforeNext / 1000)) };
  }
  return { allowed: true };
}

// Gasta un punto por cada request (registro).
export async function checkRateLimit(key: RateLimitKey, identifier: string): Promise<RateLimitResult> {
  return consumeLimiter(await getLimiter(key), identifier);
}

// Login: solo los intentos fallidos gastan puntos, y un login exitoso los limpia.
export async function peekRateLimit(key: RateLimitKey, identifier: string): Promise<RateLimitResult> {
  return peekLimiter(await getLimiter(key), identifier);
}

export async function recordRateLimitFailure(key: RateLimitKey, identifier: string): Promise<void> {
  await consumeLimiter(await getLimiter(key), identifier);
}

export async function resetRateLimit(key: RateLimitKey, identifier: string): Promise<void> {
  await (await getLimiter(key)).delete(identifier);
}
