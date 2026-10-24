import type { Caso, Mision } from "@syntaxerror/content/tipos";

export type Herramienta = "sql" | "planilla" | "python" | "github" | "caso";

// La primera idea del concepto de la lección, para presentarla en el panel sin abrirla.
export function resumenLeccion(mision: Mision): string | null {
  const concepto = mision.bloques.find((bloque) => bloque.tipo === "Concepto")?.texto;
  if (!concepto) return null;
  const frase = concepto.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? concepto;
  return frase.length > 220 ? `${frase.slice(0, 217).trimEnd()}…` : frase;
}

// Lo que dice el panel bajo el título de unas clases o un caso.
export function resumenCaso(caso: Caso): string {
  if (caso.tipo === "clases") return `Practica con datos de ${caso.dataset}.`;
  return `${caso.cargo} en ${caso.empresa}: ${caso.entregable.charAt(0).toLowerCase()}${caso.entregable.slice(1)}`.replace(/\.?$/, ".");
}

export function minutosEstimados(caso: Caso): number {
  return caso.misiones.reduce((total, mision) => total + mision.tiempo, 0);
}

// La herramienta que más se practica, por las tareas de sus misiones: decide el ícono de la tarjeta.
export function herramientaDelCaso(caso: Caso): Herramienta {
  if (caso.tipo === "caso") return "caso";
  const cuenta = new Map<Herramienta, number>();
  for (const bloque of caso.misiones.flatMap((mision) => mision.bloques)) {
    const herramienta: Herramienta | null =
      bloque.tipo === "SqlTask" ? "sql"
      : bloque.tipo === "SheetTask" || bloque.tipo === "Planilla" ? "planilla"
      : bloque.tipo === "PythonTask" ? "python"
      : bloque.tipo === "GithubTask" ? "github"
      : null;
    if (herramienta) cuenta.set(herramienta, (cuenta.get(herramienta) ?? 0) + 1);
  }
  return [...cuenta].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "caso";
}

// Iniciales de la ruta para su distintivo: «Data Analyst» → DA.
export function iniciales(titulo: string): string {
  return titulo
    .split(/\s+/)
    .filter(Boolean)
    .map((palabra) => palabra[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
