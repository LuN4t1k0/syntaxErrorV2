import { describe, expect, it } from "vitest";
import {
  aplicarSolucion,
  columnaALetra,
  crearHoja,
  escribirCelda,
  grillaDesdeFilas,
  leerDireccion,
  leerFormula,
  leerValor,
  revisarHoja,
  type Grilla,
  type SheetTarea,
} from "./sheet";

const ventas: Grilla = [
  ["id", "monto"],
  [101, 185000],
  [102, 62000],
  [103, 240000],
];

const total: SheetTarea = { celdas: [{ celda: "C2", valor: 487000, funcion: "SUMA" }] };

describe("direcciones A1", () => {
  it("convierte índices a letras y letras a posiciones", () => {
    expect([columnaALetra(0), columnaALetra(25), columnaALetra(26)]).toEqual(["A", "Z", "AA"]);
    expect(leerDireccion("AA10")).toEqual({ row: 9, col: 26 });
  });
});

describe("crearHoja y escribirCelda", () => {
  it("calcula las fórmulas de la grilla inicial", () => {
    const hoja = crearHoja([["a"], [1], [2], ["=SUMA(A2:A3)"]]);
    expect(leerValor(hoja, "A4")).toBe(3);
  });

  it("acepta ; como separador y funciones en minúsculas, como en Excel en español", () => {
    const hoja = crearHoja(ventas);
    escribirCelda(hoja, "C2", "=suma(b2;b3)");
    expect(leerValor(hoja, "C2")).toBe(247000);
    expect(leerFormula(hoja, "C2")).toBe("=SUMA(B2,B3)");
  });

  it("=SUMA(B2;B4) suma solo esas dos celdas, no el rango entre ellas", () => {
    const hoja = crearHoja(ventas);
    escribirCelda(hoja, "C2", "=suma(b2;b4)");
    expect(leerValor(hoja, "C2")).toBe(425000);
  });

  it("no cambia los ; ni las mayúsculas dentro de un texto", () => {
    const hoja = crearHoja(ventas);
    escribirCelda(hoja, "C2", '=SI(B2>100000;"alto;Medio";"bajo")');
    expect(leerValor(hoja, "C2")).toBe("alto;Medio");
  });
});

describe("revisarHoja", () => {
  it("aprueba el valor correcto calculado con la función pedida", () => {
    const hoja = crearHoja(ventas);
    escribirCelda(hoja, "C2", "=SUMA(B2:B4)");
    expect(revisarHoja(hoja, total)).toEqual({ aprobada: true, diagnostico: null });
  });

  it("exige la función cuando la tarea la pide, aunque el número sea correcto", () => {
    const hoja = crearHoja(ventas);
    escribirCelda(hoja, "C2", "487000");
    expect(revisarHoja(hoja, total).diagnostico).toBe("La celda C2 debe calcularse con la función SUMA.");
  });

  it("SUMAR.SI no cuenta como SUMA", () => {
    const hoja = crearHoja(ventas);
    escribirCelda(hoja, "C2", '=SUMAR.SI(B2:B4;">0")');
    expect(revisarHoja(hoja, total).aprobada).toBe(false);
  });

  it("muestra el valor obtenido y el esperado", () => {
    const hoja = crearHoja(ventas);
    escribirCelda(hoja, "C2", "=SUMA(B2:B3)");
    expect(revisarHoja(hoja, total).diagnostico).toBe('La celda C2 muestra "247000" y se espera "487000".');
  });

  it("informa los errores de fórmula", () => {
    const hoja = crearHoja(ventas);
    escribirCelda(hoja, "C2", "=B2/0");
    expect(revisarHoja(hoja, total).diagnostico).toBe(
      "La celda C2 tiene el error #¡DIV/0!. La fórmula divide por cero o por una celda vacía. Revisa la celda del divisor. Si puede valer 0, usa SI.ERROR(fórmula; 0)."
    );
  });

  it("tolera diferencias de decimales menores a 0,0001", () => {
    const hoja = crearHoja(ventas);
    escribirCelda(hoja, "C2", "=1/3");
    expect(revisarHoja(hoja, { celdas: [{ celda: "C2", valor: 0.33333 }] }).aprobada).toBe(true);
  });
});

describe("grillas desde datos", () => {
  it("grillaDesdeFilas pone los encabezados en la primera fila", () => {
    expect(grillaDesdeFilas([{ id: 1, ciudad: "Temuco" }, { id: 2, ciudad: null }])).toEqual([
      ["id", "ciudad"],
      [1, "Temuco"],
      [2, null],
    ]);
  });

  it("aplicarSolucion escribe cada celda de la solución", () => {
    const hoja = aplicarSolucion(ventas, { C2: "=SUMA(B2:B4)" });
    expect(revisarHoja(hoja, total).aprobada).toBe(true);
  });
});
