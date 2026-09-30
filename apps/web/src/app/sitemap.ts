import type { MetadataRoute } from "next";
import { casosParaPublicar, rutasParaPublicar } from "@/lib/contenido";
import { entradasSitemap } from "@/lib/seo-rutas";

// Sale del contenido publicado, no de la base, así que se genera en el build.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return entradasSitemap(await rutasParaPublicar(), await casosParaPublicar());
}
