import IORedis from "ioredis";

const READY_TIMEOUT_MS = 2000;

const globalForRedis = globalThis as { __syntaxerrorRedis?: IORedis };

// Sin cola offline: con Redis caído los comandos fallan al tiro en vez de quedar colgados.
// La contracara es que un comando enviado antes de conectar también falla, por eso quien
// use el cliente debe esperar a waitForReady.
export function createRedis(url: string): IORedis {
  return new IORedis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: READY_TIMEOUT_MS,
  });
}

export function getRedis(): IORedis {
  if (!globalForRedis.__syntaxerrorRedis) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL is not set");
    globalForRedis.__syntaxerrorRedis = createRedis(url);
  }
  return globalForRedis.__syntaxerrorRedis;
}

export function waitForReady(client: IORedis, timeoutMs = READY_TIMEOUT_MS): Promise<void> {
  if (client.status === "ready") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onReady = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      client.off("ready", onReady);
      reject(new Error("redis_not_ready"));
    }, timeoutMs);
    client.once("ready", onReady);
  });
}
