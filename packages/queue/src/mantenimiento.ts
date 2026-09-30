import { Queue } from "bullmq";
import { conexionWorker } from "./conexion";

export const COLA_MANTENIMIENTO = "mantenimiento";
export const PROGRAMADOR_LIMPIEZA = "limpieza-diaria";
export const UN_DIA_MS = 86_400_000;

// upsertJobScheduler reemplaza al programador con la misma clave: reiniciar el worker no lo duplica.
export async function programarMantenimiento(
  url: string,
  { nombre = COLA_MANTENIMIENTO, cadaMs = UN_DIA_MS }: { nombre?: string; cadaMs?: number } = {}
): Promise<void> {
  const cola = new Queue(nombre, { connection: conexionWorker(url) });
  try {
    await cola.upsertJobScheduler(PROGRAMADOR_LIMPIEZA, { every: cadaMs }, { name: PROGRAMADOR_LIMPIEZA, opts: { removeOnComplete: 30, removeOnFail: 30 } });
  } finally {
    await cola.close();
  }
}
