import { describe, expect, it } from "vitest";
import { convertirLeccionExcel, formulasDelTexto, leerFormula, moverFormula, pistaExcelUtil, solucionExcel, type LeccionExcelV1 } from "./aula-excel";

const base: LeccionExcelV1 = {
  slug: "la-funcion-si",
  title: "La funcion SI",
  duration: "14 min",
  type: "exercise",
  intro: ["SI sirve para tomar una decision."],
  syntaxExample: '=SI(condicion;"si";"no")',
  sections: [
    { heading: "Concepto principal", body: ["Una formula con SI."], formula: '=SI(condicion;"si";"no")' },
    { heading: "Uso", body: ["Para alertas."], formula: "=SI(B2<5;1;0)" },
  ],
  initialGrid: [["producto", "stock", "estado"], ["Notebook", 8, null], ["Mouse", 2, null], ["Teclado", 15, null]],
  targetCells: ["C2", "C3", "C4"],
  expectedValues: ["Stock ok", "Stock bajo", "Stock ok"],
  prompt: "Completa C2:C4 segun el stock.",
  hint: 'En C2 puedes usar =SI(B2<5;"Stock bajo";"Stock ok"). Luego repite la misma logica en C3 y C4.',
  explanation: "Solo Mouse tiene stock menor a 5.",
};

describe("fórmulas de las pistas", () => {
  it("lee una fórmula hasta el punto final, sin cortarla en los paréntesis ni en las comillas", () => {
    const texto = 'Usa =MAYUSC(A2)&" ("&B2&")". Después sigue.';
    expect(leerFormula(texto, texto.indexOf("="))).toBe('=MAYUSC(A2)&" ("&B2&")"');
  });

  it("asocia cada fórmula a su celda y se queda con la primera", () => {
    expect(formulasDelTexto("En D2 escribe =B2*C2. B2 es el precio.")).toEqual({ D2: "=B2*C2" });
    expect(formulasDelTexto("Usa el mismo rango: D2 =CONTAR(B2:B5), D3 =MAX(B2:B5), D4 =MIN(B2:B5).")).toEqual({ D2: "=CONTAR(B2:B5)", D3: "=MAX(B2:B5)", D4: "=MIN(B2:B5)" });
    expect(formulasDelTexto("Usa E2=C2*D2 y E3=C3*D3.")).toEqual({ E2: "=C2*D2", E3: "=C3*D3" });
    expect(formulasDelTexto("D5 = BUSCARV(B5,A2:C4,2,0) = Mouse.")).toEqual({});
  });

  it("baja una fórmula de fila como al arrastrarla, sin mover las referencias fijas ni el texto", () => {
    expect(moverFormula('=SI(B2<5;"B2 bajo";$B$5)', 2)).toBe('=SI(B4<5;"B2 bajo";$B$5)');
    expect(moverFormula("=B2*(1+$B$5)", 1)).toBe("=B3*(1+$B$5)");
  });

  it("la solución usa la fórmula de la pista, la repite en la misma columna o, sin fórmula, el valor esperado", () => {
    expect(solucionExcel(base)).toEqual({ C2: '=SI(B2<5;"Stock bajo";"Stock ok")', C3: '=SI(B3<5;"Stock bajo";"Stock ok")', C4: '=SI(B4<5;"Stock bajo";"Stock ok")' });
    expect(solucionExcel({ ...base, targetCells: ["B3"], expectedValues: [310000], hint: "Escribe el monto en B3." })).toEqual({ B3: 310000 });
  });

  it("descarta las pistas que traen una fórmula", () => {
    expect(pistaExcelUtil("En D2 escribe =B2*C2.")).toEqual([]);
    expect(pistaExcelUtil("Busca la fila de Diego.")).toEqual(["Busca la fila de Diego."]);
  });
});

describe("convertirLeccionExcel", () => {
  it("convierte un ejercicio con su propia planilla, sin repetir la sintaxis en las secciones", () => {
    const leccion = convertirLeccionExcel(base, 9);
    expect(leccion).toMatchObject({ slug: "09-la-funcion-si", titulo: "La función SI", intro: ["SI sirve para tomar una decisión."], sintaxis: { lenguaje: "planilla", codigo: base.syntaxExample } });
    expect(leccion.secciones.map((seccion) => seccion.formula)).toEqual([null, "=SI(B2<5;1;0)"]);
    expect(leccion.tarea).toMatchObject({
      tipo: "SheetTask",
      id: "la-funcion-si",
      enunciado: "Completa C2:C4 según el stock.",
      grilla: base.initialGrid,
      celdas: [{ celda: "C2", valor: "Stock ok" }, { celda: "C3", valor: "Stock bajo" }, { celda: "C4", valor: "Stock ok" }],
      pistas: [],
    });
  });

  it("una lectura pasa a LecturaTask con la pregunta y la respuesta del curso", () => {
    const lectura = convertirLeccionExcel({ slug: "excel-vs-base", title: "Excel vs. una base", duration: "12 min", type: "reading", prompt: "Excel o una base?", explanation: "Una base de datos." }, 22);
    expect(lectura.tarea).toEqual({ tipo: "LecturaTask", id: "excel-vs-base", pregunta: "Excel o una base?", respuesta: "Una base de datos." });
    expect(lectura.cierre).toBeNull();
    expect(() => convertirLeccionExcel({ ...base, initialGrid: undefined }, 1)).toThrow("no tiene planilla");
  });
});
