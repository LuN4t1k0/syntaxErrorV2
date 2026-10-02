import alasql from "alasql";
import { textoDeError, type Aviso, type ErrorExplicado } from "./consola";
import { avisosSql, explicarErrorSql } from "./sql-errores";
import type { Fila, ResultadoTarea } from "./tipos";

export type Tablas = Record<string, Fila[]>;
export type ModoComparacion = "filas-en-orden" | "filas-sin-orden" | "estado-tabla";
export type SqlTarea = { solucion: string; comparar: ModoComparacion; verificar?: string };
export type SqlComparacion = { comparar: ModoComparacion; verificar?: string; esperadas: Fila[] };

export type BaseSql = {
  exec(consulta: string): unknown;
  tables: Record<string, { data: Fila[] }>;
};

const Database = (alasql as unknown as { Database: new () => BaseSql }).Database;

export function crearBaseSql(tablas: Tablas): BaseSql {
  const base = new Database();
  for (const [nombre, filas] of Object.entries(tablas)) {
    base.exec(`CREATE TABLE ${nombre}`);
    base.tables[nombre].data = structuredClone(filas);
  }
  return base;
}

function quitarComentarios(consulta: string): string {
  return consulta.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

function separarSentencias(consulta: string, permitirEscritura: boolean): string[] {
  const sentencias = quitarComentarios(consulta)
    .split(";")
    .map((sentencia) => sentencia.trim())
    .filter(Boolean);
  if (sentencias.length === 0) throw new Error("Escribe una consulta antes de ejecutar.");
  if (!permitirEscritura && sentencias.some((sentencia) => !/^(select|with)\b/i.test(sentencia))) {
    throw new Error("En esta tarea solo puedes usar consultas SELECT.");
  }
  return sentencias;
}

// alasql reserva palabras que en Postgres o MySQL sirven como alias (total, count, value...).
// Entre backticks funcionan igual y la columna conserva el nombre.
const ALIAS_RESERVADOS = new Set([
  "total", "count", "sum", "avg", "value", "top", "index", "matrix", "columns", "column", "row", "cross",
]);

function protegerAlias(sentencia: string): string {
  return sentencia.replace(/\bAS\s+([A-Za-z_][A-Za-z0-9_]*)\b/gi, (coincidencia, alias: string) =>
    ALIAS_RESERVADOS.has(alias.toLowerCase()) ? `AS \`${alias}\`` : coincidencia
  );
}

function normalizarFilas(filas: Fila[]): Fila[] {
  return filas.map((fila) =>
    Object.fromEntries(
      Object.entries(fila).map(([columna, valor]) => [
        columna,
        typeof valor === "number" ? Number(valor.toFixed(4)) : valor,
      ])
    )
  );
}

export function ejecutarSql(
  base: BaseSql,
  consulta: string,
  { permitirEscritura = false }: { permitirEscritura?: boolean } = {}
): Fila[] {
  let resultado: unknown = [];
  for (const sentencia of separarSentencias(consulta, permitirEscritura)) {
    resultado = base.exec(protegerAlias(sentencia));
  }
  return Array.isArray(resultado) ? normalizarFilas(resultado as Fila[]) : [];
}

export type EjecucionSql = { ok: true; filas: Fila[]; avisos: Aviso[] } | { ok: false; error: ErrorExplicado };

export function ejecutarConsulta(
  tablas: Tablas,
  consulta: string,
  opciones: { permitirEscritura?: boolean } = {}
): EjecucionSql {
  try {
    const filas = ejecutarSql(crearBaseSql(tablas), consulta, opciones);
    return { ok: true, filas, avisos: avisosSql(consulta, tablas) };
  } catch (error) {
    return { ok: false, error: explicarErrorSql(consulta, mensajeDe(error), tablas) };
  }
}

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function serializar(filas: Fila[], sinOrden: boolean): string {
  const lineas = filas.map((fila) => JSON.stringify(fila));
  if (sinOrden) lineas.sort();
  return JSON.stringify(lineas);
}

function tomarColumnas(fila: Fila, columnas: string[]): Fila {
  const posicionales = Object.values(fila);
  return Object.fromEntries(
    columnas.map((columna, indice) => [columna, columna in fila ? fila[columna] : posicionales[indice]])
  );
}

function plural(cantidad: number, palabra: string): string {
  return `${cantidad} ${palabra}${cantidad === 1 ? "" : "s"}`;
}

function describirDiferencia(esperadas: Fila[], actuales: Fila[], sinOrden: boolean, consulta: string): string {
  if (actuales.length !== esperadas.length) {
    return `Tu consulta trae ${plural(actuales.length, "fila")}, se esperan ${esperadas.length}.`;
  }
  if (esperadas.length === 0) return "Tu resultado no coincide con lo esperado.";

  const columnas = Object.keys(esperadas[0]);
  const columnasActuales = Object.keys(actuales[0]).length;
  if (columnasActuales < columnas.length) {
    return `Tu consulta debe devolver ${plural(columnas.length, "columna")} (${columnas.join(", ")}); la tuya trae ${columnasActuales}.`;
  }

  const comparables = actuales.map((fila) => tomarColumnas(fila, columnas));
  if (!sinOrden) {
    if (serializar(comparables, true) === serializar(esperadas, true)) {
      return "Las filas son correctas, pero el orden no coincide. Revisa el ORDER BY.";
    }
    const coincide = (columna: string) =>
      esperadas.every((fila, indice) => JSON.stringify(comparables[indice][columna]) === JSON.stringify(fila[columna]));
    for (const columna of columnas) {
      if (!coincide(columna) && columnas.filter((otra) => otra !== columna).every(coincide)) {
        // Con ORDER BY, que solo cambie una columna suele ser un empate: la base ordena como quiere las filas que empatan.
        if (/\border\s+by\b/i.test(consulta)) {
          return `La columna '${columna}' no coincide en algunas filas. Si hay valores empatados en tu ORDER BY, agrega otra columna para desempatar; si no, revisa el cálculo o el filtro.`;
        }
        return `La columna '${columna}' no coincide en algunas filas. Revisa el cálculo o el filtro.`;
      }
    }
  }
  return "Tu resultado no coincide con lo esperado. Revisa el filtro, el orden y las columnas.";
}

function consultaDeVerificacion(tarea: { verificar?: string }): string {
  if (!tarea.verificar) throw new Error('comparar="estado-tabla" necesita la consulta verificar');
  return tarea.verificar;
}

export function calcularEsperado(tablas: Tablas, tarea: SqlTarea): Fila[] {
  if (tarea.comparar !== "estado-tabla") return ejecutarSql(crearBaseSql(tablas), tarea.solucion);
  const base = crearBaseSql(tablas);
  ejecutarSql(base, tarea.solucion, { permitirEscritura: true });
  return ejecutarSql(base, consultaDeVerificacion(tarea));
}

export function compararSql(tablas: Tablas, tarea: SqlComparacion, consulta: string): ResultadoTarea {
  let actuales: Fila[];
  try {
    const base = crearBaseSql(tablas);
    if (tarea.comparar === "estado-tabla") {
      ejecutarSql(base, consulta, { permitirEscritura: true });
      actuales = ejecutarSql(base, consultaDeVerificacion(tarea));
    } else {
      actuales = ejecutarSql(base, consulta);
    }
  } catch (error) {
    return { aprobada: false, diagnostico: `Tu consulta tiene un error. ${textoDeError(explicarErrorSql(consulta, mensajeDe(error), tablas))}` };
  }

  const sinOrden = tarea.comparar === "filas-sin-orden";
  const columnas = tarea.esperadas.length ? Object.keys(tarea.esperadas[0]) : null;
  const comparables = columnas ? actuales.map((fila) => tomarColumnas(fila, columnas)) : actuales;
  if (serializar(comparables, sinOrden) === serializar(tarea.esperadas, sinOrden)) {
    return { aprobada: true, diagnostico: null };
  }
  const diferencia = describirDiferencia(tarea.esperadas, actuales, sinOrden, consulta);
  const [aviso] = avisosSql(consulta, tablas);
  return { aprobada: false, diagnostico: aviso ? `${diferencia} ${aviso.mensaje}` : diferencia };
}

export function revisarSql(tablas: Tablas, tarea: SqlTarea, consulta: string): ResultadoTarea {
  return compararSql(tablas, { ...tarea, esperadas: calcularEsperado(tablas, tarea) }, consulta);
}
