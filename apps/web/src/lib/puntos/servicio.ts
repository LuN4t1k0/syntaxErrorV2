import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { Mision } from "@syntaxerror/content/tipos";
import type { AppDb, DbClient } from "@syntaxerror/db/client";
import { casos, transaccionesPuntos } from "@syntaxerror/db/schema";
import { calcularNivel, type Nivel } from "./niveles";

export const PUNTOS = { mision: 10, caso: 50, decision: 5 } as const;
export const CLAVE_CASO = "__caso__";

export type MotivoPuntos = "mision_aprobada" | "caso_completo" | "decision" | "reporte_util";
export type ResultadoDecision = { estado: "decision_no_existe" } | { estado: "registrada"; correcta: boolean; puntos: number };

// El índice único (usuario, caso, clave) hace que cada logro sume una sola vez, aunque llegue repetido.
export async function otorgarPuntos(
  db: DbClient,
  entrada: { userId: string; casoId: string; clave: string; motivo: MotivoPuntos; cantidad: number }
): Promise<boolean> {
  const filas = await db.insert(transaccionesPuntos).values(entrada).onConflictDoNothing().returning({ id: transaccionesPuntos.id });
  return filas.length > 0;
}

export async function obtenerNivel(db: DbClient, userId: string): Promise<Nivel> {
  const [fila] = await db
    .select({ total: sql<string>`coalesce(sum(${transaccionesPuntos.cantidad}), 0)` })
    .from(transaccionesPuntos)
    .where(eq(transaccionesPuntos.userId, userId));
  return calcularNivel(Number(fila?.total ?? 0));
}

export function claveDecision(mision: string, pregunta: string): string {
  return `decision:${mision}:${createHash("sha256").update(pregunta).digest("hex").slice(0, 16)}`;
}

// Solo cuenta la primera respuesta a cada decisión: elegir otra vez no suma ni resta.
export async function responderDecision(
  db: AppDb,
  userId: string,
  { casoSlug, mision, pregunta, opcion }: { casoSlug: string; mision: Mision; pregunta: string; opcion: string }
): Promise<ResultadoDecision> {
  const bloque = mision.bloques.find((candidato) => candidato.tipo === "Decision" && candidato.props.pregunta === pregunta);
  if (bloque?.tipo !== "Decision") return { estado: "decision_no_existe" };
  const elegida = bloque.props.opciones.find((candidata) => candidata.texto === opcion);
  const [caso] = await db.select({ id: casos.id }).from(casos).where(eq(casos.slug, casoSlug));
  if (!elegida || !caso) return { estado: "decision_no_existe" };

  const cantidad = elegida.correcta ? PUNTOS.decision : 0;
  const primera = await otorgarPuntos(db, { userId, casoId: caso.id, clave: claveDecision(mision.slug, pregunta), motivo: "decision", cantidad });
  return { estado: "registrada", correcta: elegida.correcta, puntos: primera ? cantidad : 0 };
}
