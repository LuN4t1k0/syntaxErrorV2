import { corregirTildes, type Celda, type Leccion } from "./leccion";

// Adaptador del aula de Excel de la v1 (aula-excel/src/data/lessons.js, exportado a JSON).
// Cada lección trae su propia planilla (initialGrid) y los valores esperados en sus celdas. La v1 no guardaba la
// fórmula de la solución: se saca de la pista o de la explicación, y el validador comprueba que dé el valor esperado.

export type SeccionExcelV1 = { heading: string; body: string[]; formula: string | null };
export type LeccionExcelV1 = {
  slug: string;
  title: string;
  duration: string;
  type: "exercise" | "reading";
  intro?: string[];
  syntaxExample?: string | null;
  sections?: SeccionExcelV1[];
  initialGrid?: Celda[][];
  targetCells?: string[];
  expectedValues?: (string | number)[];
  prompt?: string;
  hint?: string;
  explanation?: string;
};

const CELDA = /\$?([A-Z]{1,2})\$?([1-9][0-9]*)/;

// Lee una fórmula desde su «=» hasta el primer espacio, punto o coma fuera de paréntesis y de comillas.
export function leerFormula(texto: string, desde: number): string {
  let profundidad = 0;
  let enComillas = false;
  let fin = desde + 1;
  for (; fin < texto.length; fin += 1) {
    const caracter = texto[fin];
    if (caracter === '"') enComillas = !enComillas;
    else if (enComillas) continue;
    else if (caracter === "(") profundidad += 1;
    else if (caracter === ")") profundidad -= 1;
    else if (profundidad === 0 && /[\s,]/.test(caracter)) break;
    else if (profundidad === 0 && caracter === "." && (fin + 1 === texto.length || /\s/.test(texto[fin + 1]))) break;
  }
  return texto.slice(desde, fin);
}

// Las fórmulas que la pista o la explicación asocian a una celda: «En D2 escribe =B2*C2», «D3 =MAX(B2:B5)» o
// «E2=C2*D2». Se queda con la primera de cada celda.
export function formulasDelTexto(texto: string): Record<string, string> {
  const formulas: Record<string, string> = {};
  const patron = /\b([A-Z]{1,2}[1-9][0-9]*)\s*(?:(?:escribe|usa|puedes usar)\s*)?(?==)/g;
  for (const coincidencia of texto.matchAll(patron)) {
    const celda = coincidencia[1];
    if (formulas[celda]) continue;
    const formula = leerFormula(texto, (coincidencia.index ?? 0) + coincidencia[0].length);
    if (formula.length > 1) formulas[celda] = formula;
  }
  return formulas;
}

// Baja (o sube) una fórmula de fila como al arrastrarla: cambian las filas relativas, no las fijas con $ ni el texto
// entre comillas.
export function moverFormula(formula: string, filas: number): string {
  return formula
    .split(/("[^"]*")/)
    .map((parte) =>
      parte.startsWith('"')
        ? parte
        : parte.replace(/(\$?)([A-Z]{1,2})(\$?)([1-9][0-9]*)/g, (_todo, fijaColumna: string, columna: string, fijaFila: string, fila: string) =>
            `${fijaColumna}${columna}${fijaFila}${fijaFila ? fila : Number(fila) + filas}`
          )
    )
    .join("");
}

// La solución de cada celda revisada: la fórmula de la pista; si la pista dice «repite la misma lógica», la de otra
// celda de la misma columna, movida de fila; si no hay fórmula, el valor esperado (por ejemplo, escribir un monto).
export function solucionExcel(v1: LeccionExcelV1): Record<string, string | number> {
  const formulas = { ...formulasDelTexto(v1.explanation ?? ""), ...formulasDelTexto(v1.hint ?? "") };
  const solucion: Record<string, string | number> = {};
  (v1.targetCells ?? []).forEach((celda, indice) => {
    if (formulas[celda]) {
      solucion[celda] = formulas[celda];
      return;
    }
    const [, columna, fila] = CELDA.exec(celda) ?? [];
    const vecina = Object.keys(formulas).find((otra) => CELDA.exec(otra)?.[1] === columna);
    solucion[celda] = vecina ? moverFormula(formulas[vecina], Number(fila) - Number(CELDA.exec(vecina)?.[2])) : (v1.expectedValues ?? [])[indice];
  });
  return solucion;
}

// Las pistas de la v1 suelen traer la fórmula de la respuesta: esas no se importan (la revisión escribe pistas que
// orienten sin dar la respuesta).
export function pistaExcelUtil(pista: string | undefined): string[] {
  return pista && !pista.includes("=") ? [pista] : [];
}

// En Excel el texto no usa los títulos de columna como código (a diferencia de SQL), así que se corrige todo. La
// planilla, en cambio, queda tal como en la v1: sus valores y títulos son los que revisa la tarea.
export function convertirLeccionExcel(v1: LeccionExcelV1, numero: number): Leccion {
  const texto = (valor: string) => corregirTildes(valor);
  const base = {
    slug: `${String(numero).padStart(2, "0")}-${v1.slug}`,
    titulo: texto(v1.title),
    minutos: Number.parseInt(v1.duration, 10) || 15,
    intro: (v1.intro ?? []).map(texto),
    sintaxis: v1.syntaxExample ? { lenguaje: "planilla" as const, codigo: v1.syntaxExample } : null,
    // La fórmula de una sección que repite la sintaxis de la lección no se muestra dos veces.
    secciones: (v1.sections ?? []).map((seccion) => ({
      titulo: texto(seccion.heading),
      parrafos: seccion.body.map(texto),
      ejemplo: null,
      formula: seccion.formula && seccion.formula !== v1.syntaxExample ? seccion.formula : null,
    })),
  };
  if (v1.type === "reading") {
    if (!v1.prompt || !v1.explanation) throw new Error(`La lectura ${v1.slug} no tiene pregunta o respuesta`);
    return { ...base, tarea: { tipo: "LecturaTask", id: v1.slug, pregunta: texto(v1.prompt), respuesta: texto(v1.explanation) }, cierre: null };
  }
  if (!v1.initialGrid || !v1.targetCells?.length || !v1.expectedValues || !v1.prompt) {
    throw new Error(`La lección ${v1.slug} no tiene planilla, celdas o valores esperados`);
  }
  const valores = v1.expectedValues;
  return {
    ...base,
    tarea: {
      tipo: "SheetTask",
      id: v1.slug,
      enunciado: texto(v1.prompt),
      grilla: v1.initialGrid,
      celdas: v1.targetCells.map((celda, indice) => ({ celda, valor: valores[indice] })),
      solucion: solucionExcel(v1),
      pistas: pistaExcelUtil(v1.hint).map(texto),
    },
    cierre: v1.explanation ? texto(v1.explanation) : null,
  };
}
