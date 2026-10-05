import { describe, expect, it } from "vitest";
import { armarMapa, hashCorto, type PiezaRuta } from "./mapa";

const pieza = (slug: string, tipo: PiezaRuta["tipo"], unidades = 3): PiezaRuta => ({
  slug,
  titulo: slug,
  tipo,
  empresa: tipo === "caso" ? "Empresa" : "",
  unidades,
});

const RUTA: PiezaRuta[] = [
  pieza("herramientas-del-oficio", "caso", 7),
  pieza("clases-de-excel", "clases", 23),
  pieza("despachos-rapidos", "caso", 9),
  pieza("clases-de-sql", "clases", 18),
  pieza("minimarkets-del-sur", "caso", 8),
];

describe("armarMapa", () => {
  it("agrupa cada clase con el caso que la sigue, como una rama que se fusiona, y numera los casos desde 0", () => {
    const { etapas } = armarMapa(RUTA, null);
    expect(etapas.map((etapa) => [etapa.rama, etapa.clases?.slug ?? null, etapa.caso?.slug ?? null, etapa.caso?.numeroCaso ?? null])).toEqual([
      [null, null, "herramientas-del-oficio", 0],
      ["clases/excel", "clases-de-excel", "despachos-rapidos", 1],
      ["clases/sql", "clases-de-sql", "minimarkets-del-sur", 2],
    ]);
  });

  it("sin sesión todo queda disponible y sin avance", () => {
    const { etapas, resumen } = armarMapa(RUTA, null);
    expect(
      etapas
        .flatMap((etapa) => [etapa.clases, etapa.caso])
        .filter(Boolean)
        .map((p) => p?.estado)
    ).toEqual(Array(5).fill("disponible"));
    expect(resumen).toEqual({ leccionesAprobadas: 0, lecciones: 41, casosCompletos: 0, casos: 3, completa: false });
  });

  it("con avance: lo completo, lo que sigue en curso y el resto bloqueado", () => {
    const { etapas, resumen } = armarMapa(RUTA, {
      "herramientas-del-oficio": { aprobadas: 7, completo: true },
      "clases-de-excel": { aprobadas: 23, completo: true },
      "despachos-rapidos": { aprobadas: 4, completo: false },
    });
    const estados = Object.fromEntries(
      etapas
        .flatMap((etapa) => [etapa.clases, etapa.caso])
        .filter((p) => p !== null)
        .map((p) => [p.slug, [p.estado, p.aprobadas]])
    );
    expect(estados).toEqual({
      "herramientas-del-oficio": ["completo", 7],
      "clases-de-excel": ["completo", 23],
      "despachos-rapidos": ["en_curso", 4],
      "clases-de-sql": ["bloqueado", 0],
      "minimarkets-del-sur": ["bloqueado", 0],
    });
    expect(resumen).toEqual({ leccionesAprobadas: 23, lecciones: 41, casosCompletos: 1, casos: 3, completa: false });
  });

  it("un caso con todas sus misiones pero sin el entregable aprobado queda en revisión", () => {
    const { etapas } = armarMapa(RUTA, { "herramientas-del-oficio": { aprobadas: 7, completo: false } });
    expect(etapas[0].caso?.estado).toBe("en_revision");
    expect(etapas[1].clases?.estado).toBe("bloqueado");
  });

  it("con orden libre nada queda bloqueado: lo empezado muestra su avance y el resto queda disponible", () => {
    const { etapas } = armarMapa(RUTA, { "herramientas-del-oficio": { aprobadas: 2, completo: false }, "clases-de-sql": { aprobadas: 5, completo: false } }, { ordenLibre: true });
    const estados = Object.fromEntries(etapas.flatMap((etapa) => [etapa.clases, etapa.caso]).filter((p) => p !== null).map((p) => [p.slug, [p.estado, p.aprobadas]]));
    expect(estados).toEqual({
      "herramientas-del-oficio": ["en_curso", 2],
      "clases-de-excel": ["disponible", 0],
      "despachos-rapidos": ["disponible", 0],
      "clases-de-sql": ["disponible", 5],
      "minimarkets-del-sur": ["disponible", 0],
    });
  });

  it("con todo completo la ruta queda completa", () => {
    const avance = Object.fromEntries(RUTA.map((p) => [p.slug, { aprobadas: p.unidades, completo: true }]));
    expect(armarMapa(RUTA, avance).resumen.completa).toBe(true);
  });

  it("acepta rutas sin clases y clases al final, sin caso", () => {
    expect(armarMapa([pieza("demo-motor", "caso")], null).etapas).toHaveLength(1);
    const { etapas } = armarMapa([pieza("demo-motor", "caso"), pieza("clases-de-r", "clases")], null);
    expect(etapas.map((etapa) => [etapa.rama, etapa.caso?.slug ?? null])).toEqual([
      [null, "demo-motor"],
      ["clases/r", null],
    ]);
  });
});

describe("hashCorto", () => {
  it("da siete caracteres hexadecimales, siempre los mismos para el mismo texto", () => {
    expect(hashCorto("clases-de-sql")).toMatch(/^[0-9a-f]{7}$/);
    expect(hashCorto("clases-de-sql")).toBe(hashCorto("clases-de-sql"));
    expect(hashCorto("clases-de-sql")).not.toBe(hashCorto("clases-de-excel"));
  });
});
