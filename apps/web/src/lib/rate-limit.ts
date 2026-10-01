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
  | "recuperar-email"
  | "tutor"
  | "reportes"
  | "clases-unirse"
  | "preguntas-profesor"
  | "entregables"
  | "github";

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
  tutor: { points: 10, duration: 60 },
  reportes: { points: 5, duration: 3600 },
  "clases-unirse": { points: 10, duration: 900 },
  "preguntas-profesor": { points: 5, duration: 3600 },
  entregables: { points: 10, duration: 3600 },
  // Cada revisión consulta la API de GitHub (hasta 4 llamadas): sin token, el límite es de 60 por hora para todo el servidor.
  github: { points: 20, duration: 600 },
};

const limiters = new Map<RateLimitKey, RateLimiterRedis>();
let ultimoAviso = 0;

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

function avisarRedisCaido(key: RateLimitKey, error: unknown): void {
  if (Date.now() - ultimoAviso < 60_000) return;
  ultimoAviso = Date.now();
  console.warn(
    `[rate-limit] Redis no responde (${key}); se deja pasar sin límite mientras vuelve.`,
    error instanceof Error ? error.message : error
  );
}

async function conRedisOpcional<T>(
  key: RateLimitKey,
  accion: (limiter: RateLimiterRedis) => Promise<T>,
  siRedisFalla: T
): Promise<T> {
  try {
    return await accion(await getLimiter(key));
  } catch (error) {
    avisarRedisCaido(key, error);
    return siRedisFalla;
  }
}

// Gasta un punto por cada request (registro).
export async function checkRateLimit(key: RateLimitKey, identifier: string): Promise<RateLimitResult> {
  return conRedisOpcional(key, (limiter) => consumeLimiter(limiter, identifier), { allowed: true });
}

// Login: solo los intentos fallidos gastan puntos, y un login exitoso los limpia.
export async function peekRateLimit(key: RateLimitKey, identifier: string): Promise<RateLimitResult> {
  return conRedisOpcional(key, (limiter) => peekLimiter(limiter, identifier), { allowed: true });
}

export async function recordRateLimitFailure(key: RateLimitKey, identifier: string): Promise<void> {
  await conRedisOpcional(key, async (limiter) => void (await consumeLimiter(limiter, identifier)), undefined);
}

export async function resetRateLimit(key: RateLimitKey, identifier: string): Promise<void> {
  await conRedisOpcional(key, async (limiter) => void (await limiter.delete(identifier)), undefined);
}
