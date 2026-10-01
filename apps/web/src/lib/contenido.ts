import path from "node:path";
import { cargarContenido } from "@syntaxerror/content/cargar";
import { casosVisibles, rutasVisibles } from "@syntaxerror/content/publicacion";
import type { Caso, Contenido, Ruta } from "@syntaxerror/content/tipos";

let enCache: Promise<Contenido> | null = null;

function directorio(): string {
  return process.env.CONTENT_DIR ?? path.resolve(process.cwd(), "../../content");
}

export function incluirBorradores(): boolean {
  return process.env.CONTENT_INCLUDE_DRAFTS === "true";
}

export function obtenerContenido(): Promise<Contenido> {
  if (process.env.NODE_ENV !== "production") return cargarContenido(directorio());
  enCache ??= cargarContenido(directorio());
  return enCache;
}

export async function rutasParaPublicar(): Promise<Ruta[]> {
  return rutasVisibles(await obtenerContenido(), incluirBorradores());
}

export async function casosParaPublicar(): Promise<Caso[]> {
  return casosVisibles(await obtenerContenido(), incluirBorradores());
}

export async function obtenerRuta(slug: string): Promise<Ruta | null> {
  return (await rutasParaPublicar()).find((ruta) => ruta.slug === slug) ?? null;
}

export async function obtenerCaso(slug: string): Promise<Caso | null> {
  return (await casosParaPublicar()).find((caso) => caso.slug === slug) ?? null;
}

export async function casosDeRuta(ruta: Ruta): Promise<Caso[]> {
  const casos = await casosParaPublicar();
  return ruta.casos.flatMap((slug) => casos.filter((caso) => caso.slug === slug));
}
