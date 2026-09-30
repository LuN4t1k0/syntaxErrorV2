import { describe, expect, it } from "vitest";
import { crearHoja, escribirCelda, leerFormula, leerValor, revisarHoja } from "./sheet";

describe("sheet", () => {
  it("acepta ; y funciones en minúsculas", () => {
    const hoja = crearHoja([["monto"], [185000], [62000]]);
    escribirCelda(hoja, "B2", "=suma(a2;a3)");
    expect(leerValor(hoja, "B2")).toBe(247000);
    expect(leerFormula(hoja, "B2")).toBe("=SUMA(A2:A3)");
  });

  it("interpreta dos celdas de SUMA como rango cuando comparten fila o columna", () => {
    const hoja = crearHoja([["monto"], [185000], [62000], [210000], [147000], [390000], [55000]]);
    escribirCelda(hoja, "B2", "=suma(a2;a7)");
    expect(leerValor(hoja, "B2")).toBe(1049000);
    expect(leerFormula(hoja, "B2")).toBe("=SUMA(A2:A7)");
  });

  it("revisa valor y función", () => {
    const hoja = crearHoja([["monto"], [185000], [62000]]);
    escribirCelda(hoja, "B2", "=SUMA(A2:A3)");
    expect(revisarHoja(hoja, { celdas: [{ celda: "B2", valor: 247000, funcion: "SUMA" }] })).toEqual({
      aprobada: true,
      diagnostico: null,
    });
  });
});
