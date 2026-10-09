import type { RutaConEstado } from "@syntaxerror/content/publicacion";

// La portada promueve Data Analyst, nunca la primera ruta arbitraria del catálogo.
// Usa el mismo estado vigente y la misma excepción local que el control de acceso.
export function estadoPortada(
  rutas: Pick<RutaConEstado, "slug" | "estadoVigente">[],
  incluirBorradores: boolean,
): "disponible" | "beta" | "no-disponible" {
  const ruta = rutas.find((ruta) => ruta.slug === "data-analyst");
  if (!ruta) return "no-disponible";
  if (incluirBorradores || ruta.estadoVigente === "publicada")
    return "disponible";
  return ruta.estadoVigente === "beta" ? "beta" : "no-disponible";
}
