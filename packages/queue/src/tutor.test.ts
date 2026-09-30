import { Queue } from "bullmq";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { conexionWorker } from "./conexion";
import { crearColaTutor, type TrabajoTutor } from "./tutor";

const url = process.env.REDIS_URL ?? "redis://redis:6379";
const nombre = `tutor-test-${process.pid}`;
const inspector = new Queue(nombre, { connection: conexionWorker(url) });

afterEach(() => inspector.obliterate({ force: true }));
afterAll(() => inspector.close());

describe("crearColaTutor", () => {
  it("encola la pregunta con 2 intentos", async () => {
    const cola = crearColaTutor(url, { nombre });
    const trabajo: TrabajoTutor = {
      preguntaId: "p1",
      clientId: "c1",
      casoId: "caso",
      mision: "m1",
      pregunta: "¿Cómo filtro?",
      contexto: "Misión: Filtrar.",
      embedding: [0.1, 0.2],
    };
    await cola.encolar(trabajo);

    const [job] = await inspector.getJobs(["waiting"]);
    expect(job.name).toBe("responder");
    expect(job.data).toEqual(trabajo);
    expect(job.opts.attempts).toBe(2);
    await cola.cerrar();
  });
});
