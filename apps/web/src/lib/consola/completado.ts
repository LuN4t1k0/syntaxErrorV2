import type { EsquemaSql } from "@syntaxerror/engines/sql-errores";
import { GLOSARIO_PYTHON, GLOSARIO_SQL } from "./glosario";

export type Opcion = { label: string; type: string; detail: string; info?: string };
export type Completado = { desde: number; opciones: Opcion[] };
export type DatosPython = { columnas: string[]; archivos: string[]; variables: string[] };

const PALABRAS_SQL = [
  "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "LIKE", "BETWEEN", "IS NULL", "IS NOT NULL", "AS", "DISTINCT",
  "JOIN", "INNER JOIN", "LEFT JOIN", "ON", "GROUP BY", "HAVING", "ORDER BY", "ASC", "DESC", "LIMIT", "CASE", "WHEN",
  "THEN", "ELSE", "END",
];
const FUNCIONES_SQL = ["COUNT", "SUM", "AVG", "MIN", "MAX", "ROUND", "UPPER", "LOWER", "LENGTH", "COALESCE"];
const PALABRAS_PYTHON = ["import", "from", "as", "def", "return", "if", "elif", "else", "for", "in", "while", "and", "or", "not", "True", "False", "None"];
const FUNCIONES_PYTHON = ["print", "len", "round", "sum", "range", "str", "int", "float", "list", "dict", "sorted", "min", "max", "abs"];
const METODOS_PANDAS: [string, string][] = [
  ["read_csv", "leer un archivo CSV"], ["head", "primeras filas"], ["tail", "últimas filas"], ["describe", "resumen estadístico"],
  ["info", "columnas y tipos"], ["groupby", "agrupar por columna"], ["sum", "sumar"], ["mean", "promedio"],
  ["median", "mediana"], ["count", "contar valores"], ["min", "mínimo"], ["max", "máximo"],
  ["sort_values", "ordenar por columna"], ["value_counts", "contar cada valor"], ["unique", "valores distintos"],
  ["nunique", "cantidad de valores distintos"], ["merge", "unir dos tablas"], ["reset_index", "índice a columna"],
  ["loc", "filas y columnas por nombre"], ["iloc", "filas y columnas por posición"], ["query", "filtrar con una condición"],
  ["agg", "varios resúmenes a la vez"], ["dropna", "quitar filas vacías"], ["fillna", "rellenar vacíos"],
  ["astype", "cambiar el tipo"], ["round", "redondear"], ["shape", "tamaño de la tabla"], ["columns", "nombres de columnas"],
  ["rename", "renombrar columnas"], ["drop", "quitar filas o columnas"], ["to_csv", "guardar como CSV"],
];

const NOMBRE = /[A-Za-z_]\w*$/;

function infoSql(palabra: string): string | undefined {
  return GLOSARIO_SQL[palabra.split(" ")[0]]?.explicacion;
}

function conInfo(opcion: Opcion, info: string | undefined): Opcion {
  return info ? { ...opcion, info } : opcion;
}

// La tabla a la que apunta «c.» en «FROM clientes c» o «FROM clientes AS c», o la tabla misma.
function tablaDeCalificador(calificador: string, texto: string, esquema: EsquemaSql): string | null {
  if (esquema[calificador]) return calificador;
  for (const coincidencia of texto.matchAll(/\b([A-Za-z_]\w*)(?=\s+(?:AS\s+)?([A-Za-z_]\w*)\b)/gi)) {
    if (esquema[coincidencia[1]] && coincidencia[2].toLowerCase() === calificador.toLowerCase()) return coincidencia[1];
  }
  return null;
}

export function completarSql(texto: string, posicion: number, esquema: EsquemaSql): Completado | null {
  const antes = texto.slice(0, posicion);
  if ((antes.match(/'/g) ?? []).length % 2 === 1) return null;
  const calificado = /([A-Za-z_]\w*)\.(\w*)$/.exec(antes);
  if (calificado) {
    const tabla = tablaDeCalificador(calificado[1], texto, esquema);
    if (!tabla) return null;
    return {
      desde: posicion - calificado[2].length,
      opciones: esquema[tabla].map((columna) => ({ label: columna, type: "property", detail: `columna de ${tabla}` })),
    };
  }
  const palabra = NOMBRE.exec(antes);
  if (!palabra) return null;
  const columnas = new Map<string, string[]>();
  for (const [tabla, lista] of Object.entries(esquema)) {
    for (const columna of lista) columnas.set(columna, [...(columnas.get(columna) ?? []), tabla]);
  }
  return {
    desde: posicion - palabra[0].length,
    opciones: [
      ...Object.keys(esquema).map((tabla) => ({ label: tabla, type: "class", detail: "tabla del caso" })),
      ...[...columnas].map(([columna, tablas]) => ({ label: columna, type: "property", detail: `columna de ${tablas.join(", ")}` })),
      ...PALABRAS_SQL.map((clave) => conInfo({ label: clave, type: "keyword", detail: "palabra clave" }, infoSql(clave))),
      ...FUNCIONES_SQL.map((funcion) => conInfo({ label: funcion, type: "function", detail: "función" }, infoSql(funcion))),
    ],
  };
}

export function variablesDe(codigo: string): string[] {
  const patron = /^[ \t]*(?:([A-Za-z_]\w*)[ \t]*=(?!=)|import[ \t]+[\w.]+[ \t]+as[ \t]+(\w+)|from[ \t]+[\w.]+[ \t]+import[ \t]+(\w+))/gm;
  return [...new Set([...codigo.matchAll(patron)].map((coincidencia) => coincidencia[1] ?? coincidencia[2] ?? coincidencia[3]))];
}

type Contexto = { tipo: "codigo" } | { tipo: "comentario" } | { tipo: "texto"; antes: string; escrito: string };

// Mira solo la línea actual: dónde está el cursor (código, comentario o texto entre comillas).
function contextoDe(linea: string): Contexto {
  let comilla: string | null = null;
  let inicio = 0;
  for (let i = 0; i < linea.length; i += 1) {
    const caracter = linea[i];
    if (comilla) {
      if (caracter === comilla) comilla = null;
    } else if (caracter === '"' || caracter === "'") {
      comilla = caracter;
      inicio = i;
    } else if (caracter === "#") {
      return { tipo: "comentario" };
    }
  }
  return comilla ? { tipo: "texto", antes: linea.slice(0, inicio), escrito: linea.slice(inicio + 1) } : { tipo: "codigo" };
}

export function completarPython(texto: string, posicion: number, datos: DatosPython): Completado | null {
  const antes = texto.slice(0, posicion);
  const contexto = contextoDe(antes.slice(antes.lastIndexOf("\n") + 1));
  if (contexto.tipo === "comentario") return null;
  if (contexto.tipo === "texto") {
    const desde = posicion - contexto.escrito.length;
    if (/read_csv\(\s*$/.test(contexto.antes)) {
      return { desde, opciones: datos.archivos.map((archivo) => ({ label: archivo, type: "text", detail: "archivo del caso" })) };
    }
    if (/\[\s*$/.test(contexto.antes) && datos.columnas.length > 0) {
      return { desde, opciones: datos.columnas.map((columna) => ({ label: columna, type: "property", detail: "columna de los datos" })) };
    }
    return null;
  }
  const metodo = /\.(\w*)$/.exec(antes);
  if (metodo) {
    return {
      desde: posicion - metodo[1].length,
      opciones: METODOS_PANDAS.map(([nombre, detalle]) => conInfo({ label: nombre, type: "method", detail: detalle }, GLOSARIO_PYTHON[`.${nombre}`]?.explicacion)),
    };
  }
  const palabra = NOMBRE.exec(antes);
  if (!palabra) return null;
  const delCaso = new Set(datos.variables);
  const propias = variablesDe(texto).filter((variable) => !delCaso.has(variable));
  return {
    desde: posicion - palabra[0].length,
    opciones: [
      ...datos.variables.map((variable) => ({ label: variable, type: "variable", detail: "variable del caso" })),
      ...propias.map((variable) => ({ label: variable, type: "variable", detail: "tu variable" })),
      ...PALABRAS_PYTHON.map((clave) => conInfo({ label: clave, type: "keyword", detail: "palabra clave" }, GLOSARIO_PYTHON[clave]?.explicacion)),
      ...FUNCIONES_PYTHON.map((funcion) => conInfo({ label: funcion, type: "function", detail: "función" }, GLOSARIO_PYTHON[funcion]?.explicacion)),
    ],
  };
}
