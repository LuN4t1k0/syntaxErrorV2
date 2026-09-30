import { HyperFormula } from "hyperformula";
import esES from "hyperformula/i18n/languages/esES";
import type { Fila, ResultadoTarea } from "./tipos";

if (!HyperFormula.getRegisteredLanguagesCodes().includes("esES")) {
  HyperFormula.registerLanguage("esES", esES);
}

export type ValorCelda = string | number | boolean | null;
export type Grilla = ValorCelda[][];
export type Hoja = HyperFormula;
export type CeldaEsperada = { celda: string; valor: string | number | boolean; funcion?: string };
export type SheetTarea = { celdas: CeldaEsperada[] };

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function columnaALetra(indice: number): string {
  let letras = "";
  let n = indice + 1;
  while (n > 0) {
    const resto = (n - 1) % 26;
    letras = LETRAS[resto] + letras;
    n = Math.floor((n - 1) / 26);
  }
  return letras;
}

function letraAColumna(letras: string): number {
  let indice = 0;
  for (const letra of letras) indice = indice * 26 + LETRAS.indexOf(letra) + 1;
  return indice - 1;
}

export function leerDireccion(a1: string): { row: number; col: number } {
  const coincidencia = a1.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!coincidencia) throw new Error(`Dirección de celda inválida: ${a1}`);
  return { row: Number(coincidencia[2]) - 1, col: letraAColumna(coincidencia[1]) };
}

export function normalizarFormula(contenido: string): string {
  if (!contenido.startsWith("=")) return contenido;
  let resultado = "";
  let enTexto = false;
  for (let i = 0; i < contenido.length; i += 1) {
    const caracter = contenido[i];
    if (caracter === '"') {
      if (enTexto && contenido[i + 1] === '"') {
        resultado += '""';
        i += 1;
        continue;
      }
      enTexto = !enTexto;
      resultado += caracter;
      continue;
    }
    if (enTexto) resultado += caracter;
    else resultado += caracter === ";" ? "," : caracter.toUpperCase();
  }
  return resultado;
}

export function crearHoja(grilla: Grilla): Hoja {
  const normalizada = grilla.map((fila) =>
    fila.map((valor) => (typeof valor === "string" ? normalizarFormula(valor) : valor))
  );
  return HyperFormula.buildFromArray(normalizada, { licenseKey: "gpl-v3", language: "esES" });
}

export function escribirCelda(hoja: Hoja, a1: string, contenido: string | number): void {
  const valor = typeof contenido === "string" ? normalizarFormula(contenido.trim()) : contenido;
  hoja.setCellContents({ sheet: 0, ...leerDireccion(a1) }, valor);
}

export function leerValor(hoja: Hoja, a1: string): unknown {
  return hoja.getCellValue({ sheet: 0, ...leerDireccion(a1) });
}

export function leerFormula(hoja: Hoja, a1: string): string | undefined {
  return hoja.getCellFormula({ sheet: 0, ...leerDireccion(a1) });
}

export function dimensiones(hoja: Hoja): { filas: number; columnas: number } {
  const { height, width } = hoja.getSheetDimensions(0);
  return { filas: height, columnas: width };
}

function esError(valor: unknown): valor is { value: string } {
  return typeof valor === "object" && valor !== null && "type" in valor && "value" in valor;
}

export function formatearValor(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (esError(valor)) return String(valor.value);
  return String(valor);
}

function mismoValor(actual: unknown, esperado: string | number | boolean): boolean {
  if (typeof actual === "number" && typeof esperado === "number") return Math.abs(actual - esperado) < 0.0001;
  if (typeof actual === "string" && typeof esperado === "string") return actual.trim() === esperado.trim();
  return actual === esperado;
}

function usaFuncion(formula: string, funcion: string): boolean {
  const nombre = funcion.toUpperCase().replace(/\./g, "\\.");
  return new RegExp(`(^|[^A-Z0-9.])${nombre}\\(`).test(formula.toUpperCase());
}

export function revisarHoja(hoja: Hoja, tarea: SheetTarea): ResultadoTarea {
  for (const esperada of tarea.celdas) {
    const valor = leerValor(hoja, esperada.celda);
    if (esError(valor)) {
      return { aprobada: false, diagnostico: `La celda ${esperada.celda} tiene un error: ${valor.value}.` };
    }
    if (esperada.funcion) {
      const formula = leerFormula(hoja, esperada.celda);
      if (!formula || !usaFuncion(formula, esperada.funcion)) {
        return {
          aprobada: false,
          diagnostico: `La celda ${esperada.celda} debe calcularse con la función ${esperada.funcion.toUpperCase()}.`,
        };
      }
    }
    if (!mismoValor(valor, esperada.valor)) {
      return {
        aprobada: false,
        diagnostico: `La celda ${esperada.celda} muestra "${formatearValor(valor)}" y se espera "${esperada.valor}".`,
      };
    }
  }
  return { aprobada: true, diagnostico: null };
}

export function aplicarSolucion(grilla: Grilla, solucion: Record<string, string | number>): Hoja {
  const hoja = crearHoja(grilla);
  for (const [celda, contenido] of Object.entries(solucion)) escribirCelda(hoja, celda, contenido);
  return hoja;
}

function aCelda(valor: unknown): ValorCelda {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "number" || typeof valor === "boolean") return valor;
  return String(valor);
}

export function grillaDesdeFilas(filas: Fila[]): Grilla {
  if (filas.length === 0) return [];
  const columnas = Object.keys(filas[0]);
  return [columnas, ...filas.map((fila) => columnas.map((columna) => aCelda(fila[columna])))];
}
