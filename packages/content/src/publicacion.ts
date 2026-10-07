import { TIPOS_TAREA, type BloqueTarea } from "./esquemas";
import type { Caso, Contenido, Mision, Ruta } from "./tipos";

export type EstadoRuta = "publicada" | "beta" | "filtrada" | "borrador" | "oculta";
export type RutaConEstado = Ruta & { estadoVigente: EstadoRuta; estadoAdmin?: EstadoRuta | null };

export function estadoVigenteRuta(ruta: Pick<Ruta, "estado"> & { estadoAdmin?: EstadoRuta | null }): EstadoRuta {
  if (ruta.estado === "borrador") return "borrador";
  return ruta.estadoAdmin ?? ruta.estado;
}

export function rutaUsable(estado: EstadoRuta, accesoBeta: boolean): boolean {
  return estado === "publicada" || (estado === "beta" && accesoBeta);
}

// Las rutas que se ven: las publicadas y, si se pide `beta` (para construir), también las beta y las filtradas, cuyas
// páginas existen aunque no se abran: el admin las puede abrir sin un deploy. Con los borradores a la vista
// (desarrollo y e2e), todas.
export function rutasVisibles(contenido: Contenido, incluirBorradores: boolean, { beta = false }: { beta?: boolean } = {}): Ruta[] {
  return contenido.rutas.filter((ruta) => incluirBorradores || ruta.estado === "publicada" || (beta && (ruta.estado === "beta" || ruta.estado === "filtrada")));
}

export function casosVisibles(contenido: Contenido, incluirBorradores: boolean, opciones: { beta?: boolean } = {}): Caso[] {
  const slugs = new Set(rutasVisibles(contenido, incluirBorradores, opciones).flatMap((ruta) => ruta.casos));
  return contenido.casos.filter((caso) => slugs.has(caso.slug));
}

// Los casos que solo están en rutas en beta: solo los pueden hacer probadores y admins. Con los borradores a la vista
// no hay ninguno: en desarrollo y en los e2e todo queda abierto.
export function casosSoloBeta(contenido: Contenido, incluirBorradores: boolean): Set<string> {
  const publicos = new Set(casosVisibles(contenido, incluirBorradores).map((caso) => caso.slug));
  return new Set(casosVisibles(contenido, incluirBorradores, { beta: true }).map((caso) => caso.slug).filter((slug) => !publicos.has(slug)));
}

export function tareasDeMision(mision: Mision): BloqueTarea[] {
  return mision.bloques.filter((bloque): bloque is BloqueTarea => (TIPOS_TAREA as readonly string[]).includes(bloque.tipo));
}
