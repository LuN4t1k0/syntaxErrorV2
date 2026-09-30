import { Worker } from "bullmq";
import { COLA_EMAILS, conexionWorker, type TrabajoEmail } from "@syntaxerror/queue/emails";
import { crearProcesadorEmails } from "./emails/procesar";
import { getRedis } from "./redis";
import { createWorkerServer } from "./server";

const port = Number(process.env.CHAT_SOCKET_PORT ?? 4001);
const corsOrigin = process.env.APP_URL ?? "http://localhost:3000";
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("REDIS_URL is not set");

const redis = getRedis();
const { httpServer, io } = createWorkerServer({ redis, corsOrigin });

const emails = new Worker<TrabajoEmail>(COLA_EMAILS, crearProcesadorEmails(), {
  connection: conexionWorker(redisUrl),
  concurrency: 2,
});
emails.on("failed", (job, error) => {
  console.error(`[emails] falló ${job?.name ?? "trabajo"} (intento ${job?.attemptsMade ?? "?"}): ${error.message}`);
});
emails.on("error", (error) => {
  console.error(`[emails] error de worker: ${error.message}`);
});

httpServer.listen(port, () => {
  console.log(`[worker] escuchando en :${port}`);
});

async function shutdown(signal: string) {
  console.log(`[worker] ${signal}: cerrando`);
  io.close();
  await emails.close();
  await redis.quit();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
