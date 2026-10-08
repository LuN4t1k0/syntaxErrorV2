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
  mostrarValor,
  nombresDeHojas,
  rellenarHaciaAbajo,
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

describe("varias hojas, rellenar hacia abajo y fechas", () => {
  const despachos: Grilla = [
    ["id", "fecha_pedido", "fecha_entrega", "comuna", "costo"],
    [1001, "03/03/2025", "05/03/2025", "Maipú", 4700],
    [1002, "04/03/2025", "2025-03-06", "Ñuñoa", 3900],
    [1003, "05/03/2025", "06/03/2025", "Maipú", 5300],
  ];
  const comunas: Grilla = [
    ["comuna", "tarifa", "dias_compromiso"],
    ["Ñuñoa", 3100, 1],
    ["Maipú", 3500, 2],
  ];
  const opciones = { nombre: "despachos", otras: { comunas } };

  it("consulta otra hoja por su nombre", () => {
    const hoja = crearHoja(despachos, opciones);
    expect(nombresDeHojas(hoja)).toEqual(["despachos", "comunas"]);
    escribirCelda(hoja, "F2", "=BUSCARV(D2;comunas!A2:C3;2;FALSO())");
    expect(leerValor(hoja, "F2")).toBe(3500);
    expect(leerValor(hoja, "B3", 1)).toBe(3500);
  });

  it("rellena hacia abajo ajustando las referencias relativas y no las absolutas", () => {
    const hoja = crearHoja(despachos, { ...opciones, inicial: { H1: 0.19 } });
    escribirCelda(hoja, "F2", "=E2*(1+$H$1)");
    rellenarHaciaAbajo(hoja, "F2", 4);
    expect(leerFormula(hoja, "F4")).toBe("=E4*(1+$H$1)");
    expect(leerValor(hoja, "F4")).toBeCloseTo(6307, 4);
    expect(leerValor(hoja, "F5")).toBeNull();
  });

  it("aplica soluciones con rangos de una columna y celdas iniciales", () => {
    const hoja = aplicarSolucion(despachos, { "F2:F4": "=C2-B2", G2: "=PROMEDIO(F2:F4)" }, { ...opciones, inicial: { "H2:H4": "=D2" } });
    expect(leerValor(hoja, "F2")).toBe(2);
    expect(leerValor(hoja, "H4")).toBe("Maipú");
    expect(() => aplicarSolucion(despachos, { "F2:G4": "=1" }, opciones)).toThrow("El rango F2:G4 debe ser una sola columna");
  });

  it("muestra las fechas como DD/MM/AAAA y deja como texto las que no lo son", () => {
    const hoja = crearHoja(despachos, opciones);
    expect(mostrarValor(hoja, "B2")).toBe("03/03/2025");
    expect(mostrarValor(hoja, "C3")).toBe("2025-03-06");
    escribirCelda(hoja, "F2", "=C2-B2");
    expect(mostrarValor(hoja, "F2")).toBe("2");
    expect(mostrarValor(hoja, "A1", 1)).toBe("comuna");
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

  it("si la celda pide una fórmula, no acepta el número escrito a mano", () => {
    const hoja = crearHoja(ventas);
    expect(revisarHoja(hoja, { celdas: [{ celda: "C2", valor: 247000, formula: true }] }).diagnostico).toBe("La celda C2 está vacía. Escribe ahí una fórmula que empiece con =.");
    escribirCelda(hoja, "C2", "247000");
    const tarea: SheetTarea = { celdas: [{ celda: "C2", valor: 247000, formula: true }] };
    expect(revisarHoja(hoja, tarea).diagnostico).toBe(
      "La celda C2 tiene el valor escrito a mano. Escribe una fórmula que empiece con =, para que el resultado se recalcule si cambian los datos."
    );
    escribirCelda(hoja, "C2", "=B2+B3");
    expect(revisarHoja(hoja, tarea).aprobada).toBe(true);
  });

  it("si la celda pide una referencia, la fórmula tiene que usarla", () => {
    const hoja = crearHoja(ventas);
    const tarea: SheetTarea = { celdas: [{ celda: "C2", valor: 185000, referencia: "$B$2" }] };
    escribirCelda(hoja, "C2", "=B2");
    expect(revisarHoja(hoja, tarea).diagnostico).toBe("La fórmula de C2 debe usar la referencia $B$2.");
    escribirCelda(hoja, "C2", "=$b$2");
    expect(revisarHoja(hoja, tarea).aprobada).toBe(true);
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

  it("dice qué muestra la celda, pero no revela el valor esperado", () => {
    const hoja = crearHoja(ventas);
    escribirCelda(hoja, "C2", "=SUMA(B2:B3)");
    const revision = revisarHoja(hoja, total);
    expect(revision).toStrictEqual({ aprobada: false, diagnostico: 'La celda C2 muestra "247000", que no es el resultado esperado. Revisa la fórmula y las celdas que usa.' });
    expect(revision.diagnostico).not.toContain("487000");
  });

  it("informa los errores de fórmula", () => {
    const hoja = crearHoja(ventas);
    escribirCelda(hoja, "C2", "=B2/0");
    expect(revisarHoja(hoja, total)).toEqual({
      aprobada: false,
      diagnostico: "La celda C2 tiene el error #¡DIV/0!. La fórmula divide por cero o por una celda vacía. Revisa la celda del divisor. Si puede valer 0, usa SI.ERROR(fórmula; 0).",
      errorDeCodigo: true,
    });
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
