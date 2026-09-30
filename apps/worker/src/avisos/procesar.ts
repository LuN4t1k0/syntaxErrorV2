import type { TrabajoAviso } from "@syntaxerror/queue/avisos";

export type EmisorAvisos = (sala: string, evento: string, datos: unknown) => void;

export function crearProcesadorAvisos(emitir: EmisorAvisos) {
  return async (job: { data: TrabajoAviso }): Promise<void> => {
    for (const sala of job.data.salas) emitir(sala, job.data.evento, job.data.datos);
  };
}
