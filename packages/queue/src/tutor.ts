import { Queue } from "bullmq";
import { conexionProductor, conLimite } from "./conexion";

export const COLA_TUTOR = "tutor";

export type TrabajoTutor = {
  preguntaId: string;
  clientId: string;
  casoId: string;
  mision: string;
  pregunta: string;
  contexto: string;
  embedding: number[];
  // Sin rol responde el tutor de la misión. El asistente del curso usa la misma cola, con mision "@asistente".
  rol?: "tutor" | "asistente";
};

export type ColaTutor = {
  encolar(trabajo: TrabajoTutor): Promise<void>;
  cerrar(): Promise<void>;
};

export function crearColaTutor(
  url: string,
  { nombre = COLA_TUTOR, limiteMs = 3_000 }: { nombre?: string; limiteMs?: number } = {}
): ColaTutor {
  const cola = new Queue<TrabajoTutor>(nombre, { connection: conexionProductor(url) });
  cola.on("error", () => {});

  return {
    async encolar(trabajo) {
      await conLimite(
        cola.add("responder", trabajo, {
          attempts: 2,
          backoff: { type: "fixed", delay: 3_000 },
          removeOnComplete: 500,
          removeOnFail: 1_000,
        }),
        limiteMs,
        "La cola del tutor no responde."
      );
    },
    cerrar: () => cola.close(),
  };
}
