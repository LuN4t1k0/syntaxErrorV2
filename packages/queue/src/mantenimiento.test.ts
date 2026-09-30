import { Queue } from "bullmq";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { conexionWorker } from "./conexion";
import { PROGRAMADOR_LIMPIEZA, programarMantenimiento } from "./mantenimiento";

const url = process.env.REDIS_URL ?? "redis://redis:6379";
const nombre = `mantenimiento-test-${process.pid}`;
const inspector = new Queue(nombre, { connection: conexionWorker(url) });

afterEach(() => inspector.obliterate({ force: true }));
afterAll(() => inspector.close());

describe("programarMantenimiento", () => {
  it("deja un solo programador diario aunque se llame en cada arranque", async () => {
    await programarMantenimiento(url, { nombre });
    await programarMantenimiento(url, { nombre });
    await programarMantenimiento(url, { nombre, cadaMs: 3_600_000 });
    const programadores = await inspector.getJobSchedulers();
    expect(programadores).toHaveLength(1);
    expect(programadores[0]).toMatchObject({ key: PROGRAMADOR_LIMPIEZA, every: 3_600_000 });
  });
});
