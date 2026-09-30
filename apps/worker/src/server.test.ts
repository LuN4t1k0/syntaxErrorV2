import type { AddressInfo } from "node:net";
import type { Server as SocketIOServer } from "socket.io";
import { io as conectar, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { EVENTO_PREGUNTA_NUEVA, EVENTO_TUTOR, PROPOSITO_TUTOR, PROPOSITO_USUARIO, salaTutor, salaUsuario } from "@syntaxerror/queue/eventos";
import { firmarTokenSocket } from "@syntaxerror/queue/token-socket";
import { createWorkerServer } from "./server";

const SECRETO = "secreto-de-prueba";
let servidor: SocketIOServer | undefined;
const clientes: Socket[] = [];

async function start(ping: () => Promise<unknown>, healthTimeoutMs?: number) {
  const { httpServer, io } = createWorkerServer({
    redis: { ping },
    corsOrigin: "http://localhost:3000",
    healthTimeoutMs,
    secretoSocket: SECRETO,
  });
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  servidor = io;
  return `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
}

function conectarCon(base: string, query: Record<string, string>): Socket {
  const cliente = conectar(base, { query, transports: ["websocket"], reconnection: false });
  clientes.push(cliente);
  return cliente;
}

afterEach(async () => {
  for (const cliente of clientes.splice(0)) cliente.close();
  await new Promise<void>((resolve) => (servidor ? servidor.close(() => resolve()) : resolve()));
  servidor = undefined;
});

describe("worker /health", () => {
  it("responde 200 cuando redis contesta", async () => {
    const base = await start(async () => "PONG");
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("responde 503 cuando redis no contesta", async () => {
    const base = await start(async () => {
      throw new Error("ECONNREFUSED");
    });
    expect((await fetch(`${base}/health`)).status).toBe(503);
  });

  it("responde 503 a tiempo cuando el ping queda colgado", async () => {
    const base = await start(() => new Promise(() => {}), 200);
    const started = Date.now();
    expect((await fetch(`${base}/health`)).status).toBe(503);
    expect(Date.now() - started).toBeLessThan(1000);
  });
});

describe("sockets del tutor", () => {
  it("con un token válido el navegador entra a su sala y recibe las respuestas", async () => {
    const base = await start(async () => "PONG");
    const token = firmarTokenSocket({ userId: "u1", clientId: "c1", proposito: PROPOSITO_TUTOR, secreto: SECRETO });
    const cliente = conectarCon(base, { clientId: "c1", token, proposito: PROPOSITO_TUTOR });
    const recibido = new Promise((resolve) => cliente.on(EVENTO_TUTOR, resolve));

    await expect.poll(async () => (await servidor!.in(salaTutor("c1")).fetchSockets()).length).toBe(1);
    const evento = { preguntaId: "p1", estado: "respondida", respuesta: "Usa WHERE." };
    servidor!.to(salaTutor("c1")).emit(EVENTO_TUTOR, evento);
    expect(await recibido).toEqual(evento);
  });

  it("con un token de otro navegador el servidor lo desconecta", async () => {
    const base = await start(async () => "PONG");
    const ajeno = firmarTokenSocket({ userId: "u1", clientId: "otro", proposito: PROPOSITO_TUTOR, secreto: SECRETO });
    const cliente = conectarCon(base, { clientId: "c1", token: ajeno, proposito: PROPOSITO_TUTOR });
    await new Promise<void>((resolve) => cliente.on("disconnect", () => resolve()));
    expect(await servidor!.in(salaTutor("c1")).fetchSockets()).toHaveLength(0);
  });
});

describe("sockets de avisos por usuario", () => {
  it("con un token de usuario entra a la sala de esa persona", async () => {
    const base = await start(async () => "PONG");
    const token = firmarTokenSocket({ userId: "u1", clientId: "c1", proposito: PROPOSITO_USUARIO, secreto: SECRETO });
    const cliente = conectarCon(base, { clientId: "c1", token, proposito: PROPOSITO_USUARIO });
    const recibido = new Promise((resolve) => cliente.on(EVENTO_PREGUNTA_NUEVA, resolve));

    await expect.poll(async () => (await servidor!.in(salaUsuario("u1")).fetchSockets()).length).toBe(1);
    servidor!.to(salaUsuario("u1")).emit(EVENTO_PREGUNTA_NUEVA, { preguntaId: "p1" });
    expect(await recibido).toEqual({ preguntaId: "p1" });
  });

  it("un token del tutor no sirve para escuchar avisos de usuario", async () => {
    const base = await start(async () => "PONG");
    const token = firmarTokenSocket({ userId: "u1", clientId: "c1", proposito: PROPOSITO_TUTOR, secreto: SECRETO });
    const cliente = conectarCon(base, { clientId: "c1", token, proposito: PROPOSITO_USUARIO });
    await new Promise<void>((resolve) => cliente.on("disconnect", () => resolve()));
    expect(await servidor!.in(salaUsuario("u1")).fetchSockets()).toHaveLength(0);
  });
});
