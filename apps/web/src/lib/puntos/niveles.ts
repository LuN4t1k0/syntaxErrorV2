export const PUNTOS_POR_NIVEL = 100;

export type Nivel = { puntos: number; nivel: number; faltan: number };

export function calcularNivel(total: number): Nivel {
  const puntos = Math.max(0, Math.floor(total));
  return { puntos, nivel: Math.floor(puntos / PUNTOS_POR_NIVEL) + 1, faltan: PUNTOS_POR_NIVEL - (puntos % PUNTOS_POR_NIVEL) };
}
