import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createWorkerServer } from "./server";

let close: (() => Promise<void>) | undefined;

async function start(ping: () => Promise<unknown>, healthTimeoutMs?: number) {
  const { httpServer, io } = createWorkerServer({ redis: { ping }, corsOrigin: "http://localhost:3000", healthTimeoutMs });
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  close = () => new Promise((resolve) => io.close(() => resolve()));
  return `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
}

describe("worker /health", () => {
  afterEach(async () => close?.());

  it("responde 200 cuando redis contesta", async () => {
    const base = await start(async () => "PONG");
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("responde 503 cuando redis no contesta", async () => {
    const base = await start(async () => { throw new Error("ECONNREFUSED"); });
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(503);
  });

  it("responde 503 a tiempo cuando el ping queda colgado", async () => {
    const base = await start(() => new Promise(() => {}), 200);
    const started = Date.now();
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(503);
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
