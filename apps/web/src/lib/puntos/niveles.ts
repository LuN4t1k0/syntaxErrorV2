export const PUNTOS_POR_NIVEL = 100;

export type Nivel = { puntos: number; nivel: number; faltan: number };

export function calcularNivel(total: number): Nivel {
  const puntos = Math.max(0, Math.floor(total));
  return { puntos, nivel: Math.floor(puntos / PUNTOS_POR_NIVEL) + 1, faltan: PUNTOS_POR_NIVEL - (puntos % PUNTOS_POR_NIVEL) };
}

// El nombre de cada tramo de niveles: unidades de información, de menor a mayor. No nombran rutas ni herramientas,
// porque los puntos se suman en cualquier ruta y en cualquier orden. Cada tramo es más largo que el anterior.
const TRAMOS: { desde: number; nombre: string }[] = [
  { desde: 1, nombre: "Bit" },
  { desde: 3, nombre: "Byte" },
  { desde: 6, nombre: "Kilobyte" },
  { desde: 10, nombre: "Megabyte" },
  { desde: 15, nombre: "Gigabyte" },
  { desde: 20, nombre: "Terabyte" },
  { desde: 24, nombre: "Petabyte" },
];

export function nombreNivel(nivel: number): string {
  return [...TRAMOS].reverse().find((tramo) => nivel >= tramo.desde)?.nombre ?? TRAMOS[0].nombre;
}
