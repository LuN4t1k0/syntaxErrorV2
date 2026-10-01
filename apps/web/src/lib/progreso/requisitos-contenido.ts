import type { Caso, Ruta } from "@syntaxerror/content/tipos";
import type { CasoCorto } from "./requisitos";

// Misma regla que casosRequeridos, calculada desde el contenido para las páginas estáticas.
export function requisitosDelCaso(rutas: Ruta[], casos: Caso[], slug: string): CasoCorto[] {
  const requeridos = new Map<string, CasoCorto>();
  for (const ruta of rutas) {
    const posicion = ruta.casos.indexOf(slug);
    if (posicion <= 0) continue;
    const anterior = casos.find((caso) => caso.slug === ruta.casos[posicion - 1]);
    if (anterior) requeridos.set(anterior.slug, { slug: anterior.slug, titulo: anterior.titulo });
  }
  return [...requeridos.values()];
}
