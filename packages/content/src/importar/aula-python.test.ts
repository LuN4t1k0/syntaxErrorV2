import { describe, expect, it } from "vitest";
import { aPython, convertirLeccionPython, identificadoresPython, leerExpresion, pruebaPython, solucionPython, type LeccionPythonV1 } from "./aula-python";

const base: LeccionPythonV1 = {
  slug: "groupby",
  title: "groupby",
  duration: "16 min",
  type: "exercise",
  intro: ["groupby agrupa las filas segun una columna, por ejemplo la region."],
  syntaxExample: 'df.groupby("columna")["otra"].sum()',
  sections: [{ heading: "Acceder a un grupo especifico", body: ["Con .loc se lee un grupo."], code: 'ventas.groupby("region")["monto"].sum()' }],
  setupCode: 'import pandas as pd\nventas = pd.DataFrame({"region":["norte","sur"],"monto":[100,80]})',
  starterCode: "resultado = None",
  resultVariable: "resultado",
  expectedValue: 100,
  prompt: "Asigna a resultado el total de la region 'norte'.",
  explanation: 'resultado = int(ventas.groupby("region")["monto"].sum().loc["norte"]) = 100.',
};

describe("la prueba de la v1", () => {
  it("escribe el valor esperado como Python", () => {
    expect(aPython(["web", 1, true, null])).toBe('["web", 1, True, None]');
    expect(aPython({ a: 1.5 })).toBe('{"a": 1.5}');
  });

  it("compara números con tolerancia y el resto por igualdad, sin decir el valor esperado", () => {
    const prueba = pruebaPython("resultado", 405000);
    expect(prueba).toContain("esperado = 405000");
    expect(prueba).toContain("abs(resultado - esperado) < 0.0001");
    expect(prueba).not.toMatch(/"[^"]*405000/);
  });
});

describe("la solución desde la explicación", () => {
  it("lee la expresión hasta « = », «produce», una coma o el punto final, sin cortar dentro de paréntesis o comillas", () => {
    const texto = 'resultado = f"{producto}: ${precio}" produce el texto';
    expect(leerExpresion(texto, "resultado = ".length)).toBe('f"{producto}: ${precio}"');
    expect(leerExpresion("resultado = len(precios) = 5.", "resultado = ".length)).toBe("len(precios)");
    expect(leerExpresion('resultado = encuesta["canal"].tolist() = ["web","tienda"].', "resultado = ".length)).toBe('encuesta["canal"].tolist()');
  });

  it("reemplaza «resultado = None» del código inicial; sin expresión en la explicación queda null", () => {
    expect(solucionPython({ ...base, starterCode: 'limpio = sensor.drop_duplicates()\nresultado = None', explanation: "Despues: resultado = len(limpio) = 3." })).toBe("limpio = sensor.drop_duplicates()\nresultado = len(limpio)");
    expect(solucionPython({ ...base, explanation: "Como stock es menor a 5, resultado debe ser Reponer." })).toBeNull();
  });
});

describe("convertirLeccionPython", () => {
  it("convierte un ejercicio: preparación, inicial, prueba, pandas y código de solo lectura, sin tocar los nombres del código", () => {
    const leccion = convertirLeccionPython(base, 25, identificadoresPython([base]));
    expect(leccion).toMatchObject({ slug: "25-groupby", intro: ["groupby agrupa las filas según una columna, por ejemplo la region."], sintaxis: { lenguaje: "python" } });
    expect(leccion.secciones[0]).toMatchObject({ titulo: "Acceder a un grupo especifico", codigo: base.sections?.[0].code });
    expect(leccion.tarea).toMatchObject({
      tipo: "PythonTask",
      id: "groupby",
      preparacion: base.setupCode,
      inicial: "resultado = None",
      solucion: 'resultado = int(ventas.groupby("region")["monto"].sum().loc["norte"])',
      paquetes: ["pandas"],
      pistas: [],
    });
  });

  it("sin expresión en la explicación marca la solución para la revisión; una lectura pasa a LecturaTask", () => {
    expect(convertirLeccionPython({ ...base, explanation: "Sin código." }, 1).tarea).toMatchObject({ solucion: "resultado = None\n# REVISAR: escribir la solución" });
    const lectura = convertirLeccionPython({ slug: "graficos", title: "Graficos", duration: "10 min", type: "reading", prompt: "Que grafico?", explanation: "Uno de lineas." }, 33);
    expect(lectura.tarea).toEqual({ tipo: "LecturaTask", id: "graficos", pregunta: "Que gráfico?", respuesta: "Uno de líneas." });
  });
});
