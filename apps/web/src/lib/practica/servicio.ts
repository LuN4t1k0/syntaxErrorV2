import { and, eq, gte, sql } from "drizzle-orm";
import type { DbClient } from "@syntaxerror/db/client";
import { misionProgreso, tiempoPractica, transaccionesPuntos } from "@syntaxerror/db/schema";
import { calcularRacha, diaLocal, inicioSemana } from "./dias";

// El navegador late cada minuto; con menos de esto entre latidos, el minuto ya está contado.
export const SEGUNDOS_ENTRE_LATIDOS = 50;
// La racha mira hacia atrás hasta aquí: más días seguidos que esto se muestran igual, pero no hace falta leerlos.
const DIAS_DE_RACHA = 120;

export type ResumenPractica = { minutosSemana: number; racha: number };

// Suma un minuto de práctica al día de hoy. Devuelve false si el latido llegó demasiado pronto.
export async function registrarLatido(db: DbClient, userId: string, ahora = new Date()): Promise<boolean> {
  const limite = new Date(ahora.getTime() - SEGUNDOS_ENTRE_LATIDOS * 1000);
  const filas = await db
    .insert(tiempoPractica)
    .values({ userId, dia: diaLocal(ahora), minutos: 1, ultimoLatido: ahora })
    .onConflictDoUpdate({
      target: [tiempoPractica.userId, tiempoPractica.dia],
      set: { minutos: sql`${tiempoPractica.minutos} + 1`, ultimoLatido: ahora },
      // En SQL crudo la fecha va como texto, igual que drizzle guarda un timestamp sin zona (UTC).
      setWhere: sql`${tiempoPractica.ultimoLatido} <= ${limite.toISOString().replace("T", " ").replace("Z", "")}`,
    })
    .returning({ minutos: tiempoPractica.minutos });
  return filas.length > 0;
}

// Minutos de esta semana y días seguidos con actividad: práctica, misiones o puntos.
export async function resumenPractica(db: DbClient, userId: string, ahora = new Date()): Promise<ResumenPractica> {
  const hoy = diaLocal(ahora);
  const desde = new Date(ahora.getTime() - DIAS_DE_RACHA * 24 * 60 * 60 * 1000);
  const [practica, misiones, puntos] = await Promise.all([
    db
      .select({ dia: tiempoPractica.dia, minutos: tiempoPractica.minutos })
      .from(tiempoPractica)
      .where(and(eq(tiempoPractica.userId, userId), gte(tiempoPractica.dia, diaLocal(desde)))),
    db
      .select({ en: misionProgreso.actualizadoEn })
      .from(misionProgreso)
      .where(and(eq(misionProgreso.userId, userId), gte(misionProgreso.actualizadoEn, desde))),
    db
      .select({ en: transaccionesPuntos.creadoEn })
      .from(transaccionesPuntos)
      .where(and(eq(transaccionesPuntos.userId, userId), gte(transaccionesPuntos.creadoEn, desde))),
  ]);
  const lunes = inicioSemana(hoy);
  const minutosSemana = practica.filter((fila) => fila.dia >= lunes).reduce((total, fila) => total + fila.minutos, 0);
  const dias = [
    ...practica.map((fila) => fila.dia),
    ...misiones.map((fila) => diaLocal(fila.en)),
    ...puntos.map((fila) => diaLocal(fila.en)),
  ];
  return { minutosSemana, racha: calcularRacha(dias, hoy) };
}
