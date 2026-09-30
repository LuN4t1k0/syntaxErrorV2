import { describe, expect, it } from "vitest";
import type { Caso, Ruta } from "@syntaxerror/content/tipos";
import { entradasSitemap, reglasRobots } from "./seo-rutas";

const RUTA = { slug: "data-analyst", titulo: "Data Analyst", cargo: "A", descripcion: "D", estado: "publicada", casos: ["ventas"] } as Ruta;
const CASO = { slug: "ventas", titulo: "Ventas", misiones: [{ slug: "01-clientes" }, { slug: "02-total" }] } as unknown as Caso;

describe("SEO", () => {
  it("robots deja fuera las páginas privadas y apunta al sitemap", () => {
    const robots = reglasRobots();
    const reglas = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules;
    expect(reglas.disallow).toEqual(expect.arrayContaining(["/admin", "/api", "/dashboard", "/perfil", "/profesor", "/login", "/registro", "/monitoring"]));
    expect(robots.sitemap).toMatch(/\/sitemap\.xml$/);
  });

  it("el sitemap lista las páginas públicas, las rutas, los casos y las misiones", () => {
    const urls = entradasSitemap([RUTA], [CASO], new Date("2026-09-30T00:00:00Z")).map((entrada) => new URL(entrada.url).pathname);
    expect(urls).toEqual([
      "/",
      "/rutas",
      "/buscar",
      "/privacidad",
      "/terminos",
      "/rutas/data-analyst",
      "/casos/ventas",
      "/casos/ventas/01-clientes",
      "/casos/ventas/02-total",
    ]);
  });
});
