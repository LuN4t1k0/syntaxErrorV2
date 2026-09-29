import { getRedis } from "./redis";
import { createWorkerServer } from "./server";

const port = Number(process.env.CHAT_SOCKET_PORT ?? 4001);
const corsOrigin = process.env.APP_URL ?? "http://localhost:3000";

const redis = getRedis();
const { httpServer, io } = createWorkerServer({ redis, corsOrigin });

httpServer.listen(port, () => {
  console.log(`[worker] escuchando en :${port}`);
});

async function shutdown(signal: string) {
  console.log(`[worker] ${signal}: cerrando`);
  io.close();
  await redis.quit();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
