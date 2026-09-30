import { createServer, type Server } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { PROPOSITO_TUTOR, salaTutor } from "@syntaxerror/queue/eventos";
import { verificarTokenSocket } from "@syntaxerror/queue/token-socket";

const DEFAULT_HEALTH_TIMEOUT_MS = 1000;

// El cliente Redis del worker usa maxRetriesPerRequest: null (lo exige BullMQ), así que con
// Redis caído el ping queda en cola para siempre. El timeout mantiene /health respondiendo.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("health_timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export function createWorkerServer(deps: {
  redis: { ping: () => Promise<unknown> };
  corsOrigin: string;
  secretoSocket: string;
  healthTimeoutMs?: number;
}): { httpServer: Server; io: SocketIOServer } {
  const healthTimeoutMs = deps.healthTimeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS;
  const httpServer = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      let ok = true;
      try {
        await withTimeout(deps.redis.ping(), healthTimeoutMs);
      } catch {
        ok = false;
      }
      res.writeHead(ok ? 200 : 503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok }));
      return;
    }
    if (!req.url?.startsWith("/socket.io")) {
      res.writeHead(404).end();
    }
  });
  const io = new SocketIOServer(httpServer, { cors: { origin: deps.corsOrigin, credentials: true } });
  io.on("connection", (socket) => {
    const { clientId, token, proposito } = socket.handshake.query;
    const valido =
      typeof clientId === "string" &&
      typeof token === "string" &&
      proposito === PROPOSITO_TUTOR &&
      verificarTokenSocket({ token, clientId, proposito, secreto: deps.secretoSocket }) !== null;
    if (!valido) {
      socket.disconnect(true);
      return;
    }
    void socket.join(salaTutor(clientId));
  });
  return { httpServer, io };
}
