import { HyperFormula } from "hyperformula";
import { describe, expect, it } from "vitest";
import { crearHoja, escribirCelda, leerValor } from "./sheet";
import { AYUDA_FUNCIONES, aplicarSugerencia, explicarErrorHoja, funcionEnEscritura, sugerenciasDeFuncion } from "./sheet-ayuda";

function errorDe(formula: string) {
  const hoja = crearHoja([["x", 1, "a"], [2, 0, 3]]);
  escribirCelda(hoja, "E1", formula);
  return explicarErrorHoja(leerValor(hoja, "E1"));
}

describe("AYUDA_FUNCIONES", () => {
  it("solo trae funciones que existen en la planilla en español", () => {
    const disponibles = new Set(HyperFormula.getRegisteredFunctionNames("esES"));
    expect(AYUDA_FUNCIONES.map((funcion) => funcion.nombre).filter((nombre) => !disponibles.has(nombre))).toEqual([]);
  });

  it("cada ejemplo se calcula sin error", () => {
    const hoja = crearHoja([["id", "ciudad", "monto"], [101, "Temuco", 50000], [102, "Santiago", 120000], [103, "Temuco", 80000]]);
    for (const funcion of AYUDA_FUNCIONES) {
      escribirCelda(hoja, "F1", funcion.ejemplo);
      expect(explicarErrorHoja(leerValor(hoja, "F1")), funcion.nombre).toBeNull();
    }
  });
});

describe("funcionEnEscritura", () => {
  it("muestra la función del paréntesis abierto más interno", () => {
    expect(funcionEnEscritura("=SUMA(")?.sintaxis).toBe("SUMA(número1; [número2]; …)");
    expect(funcionEnEscritura("=si(suma(a2:a3")?.nombre).toBe("SUMA");
    expect(funcionEnEscritura("=SI(SUMA(A2:A3);")?.nombre).toBe("SI");
    expect(funcionEnEscritura('=SI(A1="(x";')?.nombre).toBe("SI");
    expect(funcionEnEscritura("=CONTAR.SI(B2:B4;")?.nombre).toBe("CONTAR.SI");
  });

  it("no muestra nada fuera de una función o sin =", () => {
    expect(funcionEnEscritura("=SUMA(A2:A3)")).toBeNull();
    expect(funcionEnEscritura("=A2*(B2")).toBeNull();
    expect(funcionEnEscritura("SUMA(")).toBeNull();
    expect(funcionEnEscritura("=NOEXISTE(")).toBeNull();
  });
});

describe("sugerenciasDeFuncion", () => {
  it("sugiere funciones que empiezan con lo escrito", () => {
    expect(sugerenciasDeFuncion("=su").map((funcion) => funcion.nombre)).toEqual(["SUMA", "SUMAR.SI", "SUMAPRODUCTO"]);
    expect(sugerenciasDeFuncion("=SI(prom").map((funcion) => funcion.nombre)).toEqual(["PROMEDIO", "PROMEDIO.SI"]);
  });

  it("no sugiere con referencias, dentro de un texto, sin = o con el nombre completo", () => {
    expect(sugerenciasDeFuncion("=A2")).toEqual([]);
    expect(sugerenciasDeFuncion('=SI(B2="su')).toEqual([]);
    expect(sugerenciasDeFuncion("su")).toEqual([]);
    expect(sugerenciasDeFuncion("=SUMAPRODUCTO")).toEqual([]);
  });

  it("aplica la sugerencia abriendo el paréntesis", () => {
    expect(aplicarSugerencia("=SI(prom", "PROMEDIO")).toBe("=SI(PROMEDIO(");
  });
});

describe("explicarErrorHoja", () => {
  it("no explica valores que no son error", () => {
    expect(explicarErrorHoja(5)).toBeNull();
    expect(explicarErrorHoja(null)).toBeNull();
  });

  it("división por cero", () => {
    expect(errorDe("=B1/B2")).toEqual({
      mensaje: "La fórmula divide por cero o por una celda vacía.",
      sugerencia: "Revisa la celda del divisor. Si puede valer 0, usa SI.ERROR(fórmula; 0).",
      linea: null,
      original: "#¡DIV/0!",
    });
  });

  it("paréntesis sin cerrar", () => {
    expect(errorDe("=SUMA(A2:B2")).toMatchObject({ mensaje: "Falta cerrar un paréntesis en la fórmula.", sugerencia: "Cada «(» necesita su «)»." });
  });

  it("función desconocida: sugiere la parecida", () => {
    expect(errorDe("=SUMAR(A2:B2)")).toMatchObject({ mensaje: "La planilla no conoce la función SUMAR.", sugerencia: "¿Quisiste decir SUMA?" });
    expect(errorDe("=PROMEDIOS(A2:B2)")?.sugerencia).toBe("¿Quisiste decir PROMEDIO?");
  });

  it("VERDADERO o FALSO sin paréntesis, y textos sin comillas", () => {
    expect(errorDe("=FALSO")).toMatchObject({ mensaje: "La planilla no reconoce FALSO sin paréntesis.", sugerencia: "Escribe FALSO() para el valor lógico." });
    expect(errorDe("=SI(B1>0;Temuco;0)")).toMatchObject({ mensaje: "La planilla no conoce «TEMUCO».", sugerencia: 'Si es un texto, escríbelo entre comillas: "TEMUCO".' });
  });

  it("texto en una operación y rango donde va una celda", () => {
    expect(errorDe("=A1*2")?.mensaje).toBe("La fórmula opera con un texto como si fuera un número.");
    expect(errorDe("=A1:B1")?.mensaje).toBe("Aquí se espera una sola celda, no un rango.");
  });

  it("valor no encontrado y referencia circular", () => {
    expect(errorDe("=BUSCARV(9;A2:C2;2;FALSO())")?.mensaje).toBe("No se encontró el valor buscado.");
    expect(errorDe("=E1+1")?.mensaje).toBe("La fórmula se usa a sí misma (referencia circular).");
  });
});
