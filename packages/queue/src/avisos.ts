import { Queue } from "bullmq";
import { conexionProductor, conLimite } from "./conexion";
import type { AvisoPregunta, EventoComunidad } from "./eventos";

export const COLA_AVISOS = "avisos";

export type TrabajoAviso = { salas: string[]; evento: EventoComunidad; datos: AvisoPregunta };

export type ColaAvisos = {
  encolar(trabajo: TrabajoAviso): Promise<void>;
  cerrar(): Promise<void>;
};

export function crearColaAvisos(
  url: string,
  { nombre = COLA_AVISOS, limiteMs = 3_000 }: { nombre?: string; limiteMs?: number } = {}
): ColaAvisos {
  const cola = new Queue<TrabajoAviso>(nombre, { connection: conexionProductor(url) });
  cola.on("error", () => {});

  return {
    async encolar(trabajo) {
      if (trabajo.salas.length === 0) return;
      await conLimite(
        cola.add(trabajo.evento, trabajo, {
          attempts: 2,
          backoff: { type: "fixed", delay: 1_000 },
          removeOnComplete: 500,
          removeOnFail: 1_000,
        }),
        limiteMs,
        "La cola de avisos no responde."
      );
    },
    cerrar: () => cola.close(),
  };
}
