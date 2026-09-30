import { Queue } from "bullmq";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { crearColaAvisos, type TrabajoAviso } from "./avisos";
import { conexionWorker } from "./conexion";
import { EVENTO_PREGUNTA_NUEVA, salaUsuario } from "./eventos";

const url = process.env.REDIS_URL ?? "redis://redis:6379";
const nombre = `avisos-test-${process.pid}`;
const inspector = new Queue(nombre, { connection: conexionWorker(url) });
// Una sola cola para el archivo: cerrarla antes de que termine de conectar deja un rechazo sin manejar en ioredis.
const cola = crearColaAvisos(url, { nombre });

afterEach(() => inspector.obliterate({ force: true }));
afterAll(async () => {
  await cola.cerrar();
  await inspector.close();
});

describe("crearColaAvisos", () => {
  it("encola el aviso con el evento como nombre", async () => {
    const trabajo: TrabajoAviso = { salas: [salaUsuario("u1")], evento: EVENTO_PREGUNTA_NUEVA, datos: { preguntaId: "p1" } };
    await cola.encolar(trabajo);
    const [job] = await inspector.getJobs(["waiting"]);
    expect(job.name).toBe(EVENTO_PREGUNTA_NUEVA);
    expect(job.data).toEqual(trabajo);
  });

  it("sin salas no encola nada", async () => {
    await cola.encolar({ salas: [], evento: EVENTO_PREGUNTA_NUEVA, datos: { preguntaId: "p1" } });
    expect(await inspector.getJobs(["waiting"])).toHaveLength(0);
  });
});
