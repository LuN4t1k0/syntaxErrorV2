import { createServer, type Server } from "node:http";
import { Server as SocketIOServer } from "socket.io";

export function createWorkerServer(deps: {
  redis: { ping: () => Promise<unknown> };
  corsOrigin: string;
}): { httpServer: Server; io: SocketIOServer } {
  const httpServer = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      let ok = true;
      try {
        await deps.redis.ping();
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
  return { httpServer, io };
}
