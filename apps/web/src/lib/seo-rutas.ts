import type { MetadataRoute } from "next";
import type { Caso, Ruta } from "@syntaxerror/content/tipos";
import { siteConfig } from "./seo";

export const RUTAS_PRIVADAS = [
  "/admin",
  "/api",
  "/dashboard",
  "/perfil",
  "/profesor",
  "/login",
  "/registro",
  "/reportar",
  "/recuperar-clave",
  "/restablecer-clave",
  "/confirmar-email",
  "/verificar-email",
  "/monitoring",
];

const PUBLICAS = ["/", "/rutas", "/buscar", "/privacidad", "/terminos"];

export function reglasRobots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: RUTAS_PRIVADAS },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}

export function entradasSitemap(rutas: Ruta[], casos: Caso[], ahora = new Date()): MetadataRoute.Sitemap {
  const entrada = (ruta: string, prioridad: number): MetadataRoute.Sitemap[number] => ({
    url: ruta === "/" ? `${siteConfig.url}/` : `${siteConfig.url}${ruta}`,
    lastModified: ahora,
    changeFrequency: "weekly",
    priority: prioridad,
  });

  return [
    ...PUBLICAS.map((ruta) => entrada(ruta, ruta === "/" ? 1 : 0.7)),
    ...rutas.map((ruta) => entrada(`/rutas/${ruta.slug}`, 0.9)),
    ...casos.flatMap((caso) => [entrada(`/casos/${caso.slug}`, 0.9), ...caso.misiones.map((mision) => entrada(`/casos/${caso.slug}/${mision.slug}`, 0.6))]),
  ];
}
