import { sql } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";

export type HealthStatus = { ok: boolean; db: boolean; redis: boolean };

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function succeeds(check: () => Promise<unknown>, attempts = 1): Promise<boolean> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await check();
      return true;
    } catch {
      if (attempt < attempts) await delay(200);
    }
  }
  return false;
}

export async function checkHealth(deps: {
  db: AppDb;
  redis: { ping: () => Promise<unknown> };
}): Promise<HealthStatus> {
  const [db, redis] = await Promise.all([
    succeeds(() => deps.db.execute(sql`select 1`)),
    succeeds(() => deps.redis.ping(), 5),
  ]);
  return { ok: db && redis, db, redis };
}
