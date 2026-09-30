import { describe, expect, it } from "vitest";
import { armarPagina, desplazamiento, leerPagina } from "./paginacion";

describe("paginación", () => {
  it("un valor inválido o fuera de rango es la página 1", () => {
    for (const valor of [undefined, "", "abc", "-1", "0", "1.5", "99999999", ["x"]]) expect(leerPagina(valor)).toBe(1);
    expect(leerPagina("3")).toBe(3);
    expect(leerPagina(["2", "5"])).toBe(2);
  });

  it("calcula el desplazamiento y el total de páginas", () => {
    expect(desplazamiento(1)).toBe(0);
    expect(desplazamiento(3)).toBe(50);
    expect(armarPagina([], 0, 1)).toEqual({ filas: [], total: 0, pagina: 1, paginas: 1 });
    expect(armarPagina(["a"], 51, 3).paginas).toBe(3);
  });
});
