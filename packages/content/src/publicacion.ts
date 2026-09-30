import { TIPOS_TAREA, type BloqueTarea } from "./esquemas";
import type { Caso, Contenido, Mision, Ruta } from "./tipos";

export function rutasVisibles(contenido: Contenido, incluirBorradores: boolean): Ruta[] {
  return contenido.rutas.filter((ruta) => incluirBorradores || ruta.estado === "publicada");
}

export function casosVisibles(contenido: Contenido, incluirBorradores: boolean): Caso[] {
  const slugs = new Set(rutasVisibles(contenido, incluirBorradores).flatMap((ruta) => ruta.casos));
  return contenido.casos.filter((caso) => slugs.has(caso.slug));
}

export function tareasDeMision(mision: Mision): BloqueTarea[] {
  return mision.bloques.filter((bloque): bloque is BloqueTarea => (TIPOS_TAREA as readonly string[]).includes(bloque.tipo));
}
