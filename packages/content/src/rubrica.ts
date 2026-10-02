// Rúbrica estándar del equipo (propuesta pedagógica, sección 9): las mismas tres dimensiones en todos los casos,
// cada una con puntaje de 1 a 3. Cada caso describe qué se espera en cada dimensión para su entregable.
export const DIMENSIONES = ["claridad", "ejecucion", "coherencia"] as const;
export type Dimension = (typeof DIMENSIONES)[number];

export const NOMBRES_DIMENSION: Record<Dimension, string> = {
  claridad: "Claridad del README y la explicación",
  ejecucion: "Ejecución técnica del análisis",
  coherencia: "Coherencia de las conclusiones",
};

export const PUNTAJES = [1, 2, 3] as const;
export type Puntaje = (typeof PUNTAJES)[number];

export const NIVELES: Record<Puntaje, { nombre: string; descripcion: string }> = {
  1: { nombre: "Insuficiente", descripcion: "No cumple lo que se espera: falta algo central o hay errores que cambian el resultado." },
  2: { nombre: "Aceptable", descripcion: "Cumple lo que se espera en esta dimensión." },
  3: { nombre: "Destacado", descripcion: "Lo cumple y va más allá: podría mostrarse como ejemplo." },
};

// Se aprueba con al menos este puntaje en cada dimensión (decisión del equipo, 2026-10-02).
export const PUNTAJE_PARA_APROBAR: Puntaje = 2;

export type Rubrica = Record<Dimension, string>;

// Para los casos que no describen su rúbrica.
export const RUBRICA_BASE: Rubrica = {
  claridad: "El README explica qué se hizo, con qué datos y cómo revisarlo.",
  ejecucion: "Los archivos del caso resuelven el encargo y se pueden revisar: consultas, fórmulas o código que funcionan.",
  coherencia: "Las conclusiones responden la pregunta del encargo y se apoyan en los datos.",
};
