import { HyperFormula } from "hyperformula";
import esES from "hyperformula/i18n/languages/esES";
import { textoDeError } from "./consola";
import { explicarErrorHoja } from "./sheet-ayuda";
import type { Fila, ResultadoTarea } from "./tipos";

if (!HyperFormula.getRegisteredLanguagesCodes().includes("esES")) {
  HyperFormula.registerLanguage("esES", esES);
}

export type ValorCelda = string | number | boolean | null;
export type Grilla = ValorCelda[][];
export type Hoja = HyperFormula;
export type CeldaEsperada = { celda: string; valor: string | number | boolean; funcion?: string };
export type SheetTarea = { celdas: CeldaEsperada[] };
// Una tarea trabaja sobre su hoja principal (índice 0, la única que se edita) y puede consultar otras,
// por ejemplo «comunas», con referencias como comunas!A2:E13. «inicial» deja celdas escritas de antemano.
export type OpcionesHoja = { nombre?: string; otras?: Record<string, Grilla>; inicial?: Record<string, string | number> };

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

function normalizar(grilla: Grilla): Grilla {
  return grilla.map((fila) => fila.map((valor) => (typeof valor === "string" ? normalizarFormula(valor) : valor)));
}

export function crearHoja(grilla: Grilla, { nombre = "Hoja1", otras = {}, inicial = {} }: OpcionesHoja = {}): Hoja {
  const hojas: Record<string, Grilla> = { [nombre]: normalizar(grilla) };
  for (const [otra, datos] of Object.entries(otras)) hojas[otra] = normalizar(datos);
  const hoja = HyperFormula.buildFromSheets(hojas, { licenseKey: "gpl-v3", language: "esES" });
  for (const [rango, contenido] of Object.entries(inicial)) escribirRango(hoja, rango, contenido);
  return hoja;
}

export function nombresDeHojas(hoja: Hoja): string[] {
  return hoja.getSheetNames();
}

export function escribirCelda(hoja: Hoja, a1: string, contenido: string | number): void {
  const valor = typeof contenido === "string" ? normalizarFormula(contenido.trim()) : contenido;
  hoja.setCellContents({ sheet: 0, ...leerDireccion(a1) }, valor);
}

// Copia la fórmula de a1 a las filas de abajo, hasta «hastaFila» (como en la planilla: 1 es la primera),
// ajustando las referencias relativas igual que Excel al arrastrar.
export function rellenarHaciaAbajo(hoja: Hoja, a1: string, hastaFila: number): void {
  const { row, col } = leerDireccion(a1);
  hoja.copy({ start: { sheet: 0, row, col }, end: { sheet: 0, row, col } });
  for (let fila = row + 1; fila < hastaFila; fila += 1) hoja.paste({ sheet: 0, row: fila, col });
}

const RANGO_DE_COLUMNA = /^([A-Z]+)([1-9][0-9]*):([A-Z]+)([1-9][0-9]*)$/;

// "F2" escribe una celda; "F2:F41" escribe F2 y la rellena hacia abajo hasta F41.
export function escribirRango(hoja: Hoja, rango: string, contenido: string | number): void {
  const coincidencia = RANGO_DE_COLUMNA.exec(rango);
  if (!coincidencia) {
    escribirCelda(hoja, rango, contenido);
    return;
  }
  const [, desde, filaDesde, hasta, filaHasta] = coincidencia;
  if (desde !== hasta || Number(filaHasta) < Number(filaDesde)) throw new Error(`El rango ${rango} debe ser una sola columna, de arriba hacia abajo`);
  escribirCelda(hoja, `${desde}${filaDesde}`, contenido);
  rellenarHaciaAbajo(hoja, `${desde}${filaDesde}`, Number(filaHasta));
}

export function leerValor(hoja: Hoja, a1: string, indice = 0): unknown {
  return hoja.getCellValue({ sheet: indice, ...leerDireccion(a1) });
}

export function leerFormula(hoja: Hoja, a1: string, indice = 0): string | undefined {
  return hoja.getCellFormula({ sheet: indice, ...leerDireccion(a1) });
}

export function dimensiones(hoja: Hoja, indice = 0): { filas: number; columnas: number } {
  const { height, width } = hoja.getSheetDimensions(indice);
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

const dosDigitos = (numero: number) => String(numero).padStart(2, "0");

// Lo que ve la persona en la celda: las fechas como DD/MM/AAAA, no como el número de serie que guarda la planilla.
export function mostrarValor(hoja: Hoja, a1: string, indice = 0): string {
  const direccion = { sheet: indice, ...leerDireccion(a1) };
  const valor = hoja.getCellValue(direccion);
  if (typeof valor === "number" && hoja.getCellValueDetailedType(direccion) === "NUMBER_DATE") {
    const fecha = hoja.numberToDate(valor);
    if ("year" in fecha) return `${dosDigitos(fecha.day)}/${dosDigitos(fecha.month)}/${fecha.year}`;
  }
  return formatearValor(valor);
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
    const error = explicarErrorHoja(valor);
    if (error) {
      return { aprobada: false, diagnostico: `La celda ${esperada.celda} tiene el error ${error.original}. ${textoDeError(error)}` };
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

export function aplicarSolucion(grilla: Grilla, solucion: Record<string, string | number>, opciones: OpcionesHoja = {}): Hoja {
  const hoja = crearHoja(grilla, opciones);
  for (const [rango, contenido] of Object.entries(solucion)) escribirRango(hoja, rango, contenido);
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
