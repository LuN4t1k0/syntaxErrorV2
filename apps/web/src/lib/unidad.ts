import type { TipoCaso } from "@syntaxerror/content/tipos";

// Un caso se recorre en misiones; unas clases, en lecciones.
export function unidad(tipo: TipoCaso): { nombre: "misión" | "lección"; Nombre: "Misión" | "Lección" } {
  return tipo === "clases" ? { nombre: "lección", Nombre: "Lección" } : { nombre: "misión", Nombre: "Misión" };
}
