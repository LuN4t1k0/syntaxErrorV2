import { Worker } from "bullmq";
import { getDb } from "@syntaxerror/db/client";
import { crearProveedorDesdeEntorno } from "@syntaxerror/ia/proveedor";
import { COLA_AVISOS, type TrabajoAviso } from "@syntaxerror/queue/avisos";
import { COLA_EMAILS, conexionWorker, type TrabajoEmail } from "@syntaxerror/queue/emails";
import { EVENTO_TUTOR, salaTutor } from "@syntaxerror/queue/eventos";
import { COLA_TUTOR, type TrabajoTutor } from "@syntaxerror/queue/tutor";
import { crearProcesadorAvisos } from "./avisos/procesar";
import { crearProcesadorEmails } from "./emails/procesar";
import { getRedis } from "./redis";
import { createWorkerServer } from "./server";
import { crearProcesadorTutor, marcarErrorTutor, type EmisorTutor } from "./tutor/procesar";

const port = Number(process.env.CHAT_SOCKET_PORT ?? 4001);
const corsOrigin = process.env.APP_URL ?? "http://localhost:3000";
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("REDIS_URL is not set");
const secretoSocket = process.env.CHAT_SOCKET_SECRET;
if (!secretoSocket) throw new Error("CHAT_SOCKET_SECRET is not set");

const redis = getRedis();
const { httpServer, io } = createWorkerServer({ redis, corsOrigin, secretoSocket });

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

const avisos = new Worker<TrabajoAviso>(
  COLA_AVISOS,
  crearProcesadorAvisos((sala, evento, datos) => void io.to(sala).emit(evento, datos)),
  { connection: conexionWorker(redisUrl), concurrency: 5 }
);
avisos.on("error", (error) => {
  console.error(`[avisos] error de worker: ${error.message}`);
});

const emitir: EmisorTutor = (clientId, evento) => void io.to(salaTutor(clientId)).emit(EVENTO_TUTOR, evento);
const proveedor = crearProveedorDesdeEntorno();
const tutor = proveedor
  ? new Worker<TrabajoTutor>(COLA_TUTOR, crearProcesadorTutor({ db: getDb(), proveedor, emitir }), {
      connection: conexionWorker(redisUrl),
      limiter: { max: 1, duration: 2_500 },
    })
  : null;
if (!tutor) console.log("[tutor] sin GEMINI_API_KEY ni TUTOR_PRUEBA: el tutor está desactivado");
tutor?.on("failed", (job, error) => {
  console.error(`[tutor] falló una respuesta (intento ${job?.attemptsMade ?? "?"}): ${error.message}`);
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    void marcarErrorTutor(getDb(), emitir, job.data).catch((falla) => console.error("[tutor] no se pudo marcar el error", falla));
  }
});
tutor?.on("error", (error) => {
  console.error(`[tutor] error de worker: ${error.message}`);
});

httpServer.listen(port, () => {
  console.log(`[worker] escuchando en :${port}${proveedor ? ` · tutor con ${proveedor.nombre}` : ""}`);
});

async function shutdown(signal: string) {
  console.log(`[worker] ${signal}: cerrando`);
  io.close();
  await emails.close();
  await avisos.close();
  await tutor?.close();
  await redis.quit();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
