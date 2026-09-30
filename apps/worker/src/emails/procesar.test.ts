import { Worker } from "bullmq";
import { conexionWorker, crearColaEmails } from "@syntaxerror/queue/emails";
import { describe, expect, it } from "vitest";
import type { EmailSaliente } from "./enviar";
import { crearProcesadorEmails } from "./procesar";

const url = process.env.REDIS_URL ?? "redis://redis:6379";

describe("crearProcesadorEmails", () => {
  it("un trabajo encolado se procesa y se envía armado con su plantilla", async () => {
    const nombre = `emails-worker-test-${process.pid}`;
    const enviados: EmailSaliente[] = [];
    const worker = new Worker(nombre, crearProcesadorEmails(async (email) => void enviados.push(email)), {
      connection: conexionWorker(url),
    });
    const cola = crearColaEmails(url, { nombre });

    await cola.encolar({ tipo: "clave-cambiada", para: "ana@correo.cl", nombre: "Ana" });
    await expect.poll(() => enviados.length, { timeout: 10_000 }).toBe(1);
    expect(enviados[0]).toMatchObject({
      para: "ana@correo.cl",
      asunto: "syntaxError.cl — Tu contraseña fue actualizada",
    });

    await worker.close();
    await cola.cerrar();
  });
});
