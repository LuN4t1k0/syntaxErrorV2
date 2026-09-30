import type { DbClient } from "@syntaxerror/db/client";
import { purgarBitacora, purgarPreguntasTutor } from "@syntaxerror/db/mantenimiento";

export const RETENCION_POR_DEFECTO = 365;
export const RETENCION_MINIMA = 30;

// Un valor inválido nunca debe dejar la bitácora vacía.
export function leerRetencion(valor: string | undefined): number {
  const dias = Number(valor);
  if (!valor || !Number.isInteger(dias) || dias < 1) return RETENCION_POR_DEFECTO;
  return Math.max(dias, RETENCION_MINIMA);
}

export function crearProcesadorMantenimiento({
  db,
  retencionDias,
  ahora = () => new Date(),
}: {
  db: DbClient;
  retencionDias: number;
  ahora?: () => Date;
}) {
  return async (): Promise<{ bitacora: number; preguntas: number }> => {
    const antesDe = new Date(ahora().getTime() - retencionDias * 86_400_000);
    const bitacora = await purgarBitacora(db, antesDe);
    const preguntas = await purgarPreguntasTutor(db, antesDe);
    console.log(`[mantenimiento] ${bitacora} registros de bitácora y ${preguntas} preguntas al tutor anteriores a ${antesDe.toISOString()}`);
    return { bitacora, preguntas };
  };
}
