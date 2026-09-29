import { RateLimiterMemory, RateLimiterRedis, type RateLimiterRes } from "rate-limiter-flexible";
import { getRedis } from "./redis";

export type RateLimitKey = "login-email" | "login-ip" | "register-ip";

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

const LIMITER_CONFIGS: Record<RateLimitKey, { points: number; duration: number }> = {
  "login-email": { points: 5, duration: 900 },
  "login-ip": { points: 10, duration: 900 },
  "register-ip": { points: 5, duration: 3600 },
};

const limiters = new Map<RateLimitKey, RateLimiterRedis>();

function getLimiter(key: RateLimitKey): RateLimiterRedis {
  let limiter = limiters.get(key);
  if (!limiter) {
    const config = LIMITER_CONFIGS[key];
    limiter = new RateLimiterRedis({
      storeClient: getRedis(),
      keyPrefix: `rl:${key}`,
      points: config.points,
      duration: config.duration,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

export async function consumeLimiter(
  limiter: Pick<RateLimiterRedis | RateLimiterMemory, "consume">,
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

export async function checkRateLimit(key: RateLimitKey, identifier: string): Promise<RateLimitResult> {
  return consumeLimiter(getLimiter(key), identifier);
}
