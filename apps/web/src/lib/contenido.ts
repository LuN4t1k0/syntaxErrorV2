import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { cargarContenido } from "@syntaxerror/content/cargar";
import { casosSoloBeta, casosVisibles, rutasVisibles } from "@syntaxerror/content/publicacion";
import type { Caso, Contenido, Ruta } from "@syntaxerror/content/tipos";

let enCache: Promise<Contenido> | null = null;
let firmaEnCache = "";

function directorio(): string {
  return process.env.CONTENT_DIR ?? path.resolve(process.cwd(), "../../content");
}

export function incluirBorradores(): boolean {
  return process.env.CONTENT_INCLUDE_DRAFTS === "true";
}

// La fecha de modificación más reciente y la cantidad de archivos del contenido: cambia al editar, crear o borrar uno.
function firmaContenido(dir: string): string {
  let ultima = 0;
  let archivos = 0;
  for (const entrada of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entrada.isFile()) continue;
    archivos += 1;
    ultima = Math.max(ultima, statSync(path.join(entrada.parentPath, entrada.name)).mtimeMs);
  }
  return `${archivos}:${ultima}`;
}

// En producción el contenido se carga una vez. En desarrollo se vuelve a cargar solo si cambió algún archivo:
// cargarlo entero en cada llamada (varias por página, con 174 misiones) hacía que cada página tardara segundos.
export function obtenerContenido(): Promise<Contenido> {
  if (process.env.NODE_ENV !== "production") {
    const firma = firmaContenido(directorio());
    if (!enCache || firma !== firmaEnCache) {
      enCache = cargarContenido(directorio());
      firmaEnCache = firma;
    }
    return enCache;
  }
  enCache ??= cargarContenido(directorio());
  return enCache;
}

export async function rutasParaPublicar(): Promise<Ruta[]> {
  return rutasVisibles(await obtenerContenido(), incluirBorradores());
}

export async function casosParaPublicar(): Promise<Caso[]> {
  return casosVisibles(await obtenerContenido(), incluirBorradores());
}

// Lo que se construye: lo publicado más las rutas en beta, cuyas páginas existen pero no se listan.
export async function rutasParaConstruir(): Promise<Ruta[]> {
  return rutasVisibles(await obtenerContenido(), incluirBorradores(), { beta: true });
}

export async function casosParaConstruir(): Promise<Caso[]> {
  return casosVisibles(await obtenerContenido(), incluirBorradores(), { beta: true });
}

// Los casos que solo están en rutas en beta: solo los hacen probadores y admins. Vacío con los borradores a la vista.
export async function casosSoloParaProbadores(): Promise<Set<string>> {
  return casosSoloBeta(await obtenerContenido(), incluirBorradores());
}

export async function rutasEnBeta(): Promise<Ruta[]> {
  return (await rutasParaConstruir()).filter((ruta) => ruta.estado === "beta");
}

export async function obtenerRuta(slug: string): Promise<Ruta | null> {
  return (await rutasParaConstruir()).find((ruta) => ruta.slug === slug) ?? null;
}

export async function obtenerCaso(slug: string): Promise<Caso | null> {
  return (await casosParaConstruir()).find((caso) => caso.slug === slug) ?? null;
}

export async function casosDeRuta(ruta: Ruta): Promise<Caso[]> {
  const casos = await casosParaConstruir();
  return ruta.casos.flatMap((slug) => casos.filter((caso) => caso.slug === slug));
}
