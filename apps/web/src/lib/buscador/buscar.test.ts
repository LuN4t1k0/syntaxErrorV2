import { describe, expect, it } from "vitest";
import { buscar, normalizar, type EntradaBusqueda } from "./buscar";

const entrada = (tipo: EntradaBusqueda["tipo"], titulo: string, texto = ""): EntradaBusqueda => ({
  tipo,
  titulo,
  contexto: "Contexto",
  href: `/${titulo}`,
  texto: normalizar(texto),
});

const INDICE = [
  entrada("mision", "Clientes de regiones", "WHERE filtra las filas de una tabla"),
  entrada("caso", "Ventas de marzo", "clientes y ventas de la distribuidora"),
  entrada("ruta", "Data Analyst", "SQL básico, planillas y Python"),
  entrada("mision", "Ticket promedio", "promedio con pandas"),
];

describe("buscador", () => {
  it("normaliza mayúsculas, tildes, eñes y símbolos", () => {
    expect(normalizar("  SQL  Básico!  ")).toBe("sql basico");
    expect(normalizar("Año ÚLTIMO")).toBe("ano ultimo");
    expect(normalizar("***")).toBe("");
  });

  it("encuentra con o sin tildes y exige todas las palabras", () => {
    expect(buscar(INDICE, "sql basico").map((resultado) => resultado.titulo)).toEqual(["Data Analyst"]);
    expect(buscar(INDICE, "SQL  BÁSICO!").map((resultado) => resultado.titulo)).toEqual(["Data Analyst"]);
    expect(buscar(INDICE, "sql pandas")).toEqual([]);
  });

  it("prioriza el título y, a igual puntaje, rutas, casos y misiones en ese orden", () => {
    expect(buscar(INDICE, "clientes").map((resultado) => resultado.titulo)).toEqual(["Clientes de regiones", "Ventas de marzo"]);
    expect(buscar(INDICE, "promedio").map((resultado) => resultado.titulo)).toEqual(["Ticket promedio"]);
  });

  it("una búsqueda vacía o solo de símbolos no devuelve nada, y respeta el límite", () => {
    expect(buscar(INDICE, "")).toEqual([]);
    expect(buscar(INDICE, "***")).toEqual([]);
    expect(buscar(INDICE, "a", 2)).toHaveLength(2);
  });
});
