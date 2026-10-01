import { describe, expect, it } from "vitest";
import type { Caso, Ruta } from "@syntaxerror/content/tipos";
import { requisitosDelCaso } from "./requisitos-contenido";

const ruta = (slug: string, casos: string[]) => ({ slug, titulo: slug, cargo: "A", descripcion: "D", estado: "publicada", casos }) as Ruta;
const caso = (slug: string) => ({ slug, titulo: slug.toUpperCase() }) as Caso;
const CASOS = ["oficio", "planillas", "sql", "suelto"].map(caso);

describe("requisitosDelCaso", () => {
  it("devuelve el caso anterior de cada ruta, sin repetir", () => {
    const rutas = [ruta("analista", ["oficio", "planillas", "sql"]), ruta("otra", ["oficio", "planillas"])];
    expect(requisitosDelCaso(rutas, CASOS, "oficio")).toEqual([]);
    expect(requisitosDelCaso(rutas, CASOS, "planillas")).toEqual([{ slug: "oficio", titulo: "OFICIO" }]);
    expect(requisitosDelCaso(rutas, CASOS, "sql")).toEqual([{ slug: "planillas", titulo: "PLANILLAS" }]);
    expect(requisitosDelCaso(rutas, CASOS, "suelto")).toEqual([]);
  });
});
