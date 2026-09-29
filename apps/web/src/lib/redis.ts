import IORedis from "ioredis";

const globalForRedis = globalThis as { __syntaxerrorRedis?: IORedis };

export function getRedis(): IORedis {
  if (!globalForRedis.__syntaxerrorRedis) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL is not set");
    globalForRedis.__syntaxerrorRedis = new IORedis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 2000,
    });
  }
  return globalForRedis.__syntaxerrorRedis;
}
