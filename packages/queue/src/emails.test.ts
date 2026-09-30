import { Queue } from "bullmq";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { conexionWorker, crearColaEmails, type TrabajoEmail } from "./emails";

const url = process.env.REDIS_URL ?? "redis://redis:6379";
const nombre = `emails-test-${process.pid}`;
const inspector = new Queue(nombre, { connection: conexionWorker(url) });

afterEach(() => inspector.obliterate({ force: true }));
afterAll(() => inspector.close());

describe("crearColaEmails", () => {
  it("encola el trabajo con su tipo como nombre y 5 reintentos", async () => {
    const cola = crearColaEmails(url, { nombre });
    const trabajo: TrabajoEmail = { tipo: "clave-cambiada", para: "ana@correo.cl", nombre: "Ana" };
    await cola.encolar(trabajo);

    const [job] = await inspector.getJobs(["waiting"]);
    expect(job.name).toBe("clave-cambiada");
    expect(job.data).toEqual(trabajo);
    expect(job.opts.attempts).toBe(5);
    await cola.cerrar();
  });

  it("falla en menos de 4 segundos si Redis no está, en vez de dejar colgada la request", async () => {
    const cola = crearColaEmails("redis://127.0.0.1:6390", { nombre, limiteMs: 1_500 });
    const inicio = Date.now();
    await expect(cola.encolar({ tipo: "clave-cambiada", para: "ana@correo.cl", nombre: null })).rejects.toThrow();
    expect(Date.now() - inicio).toBeLessThan(4_000);
    void cola.cerrar().catch(() => {});
  });
});
