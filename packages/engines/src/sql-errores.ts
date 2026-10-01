import { errorSimple, sugerirNombre, type Aviso, type ErrorExplicado } from "./consola";
import type { Tablas } from "./sql";

export type TokenSql = { tipo: "palabra" | "texto" | "numero" | "simbolo"; valor: string; linea: number; abierto?: boolean };
export type EsquemaSql = Record<string, string[]>;

const PALABRAS_CLAVE = new Set([
  "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "IS", "NULL", "LIKE", "BETWEEN", "AS", "ON", "JOIN", "INNER",
  "LEFT", "RIGHT", "FULL", "OUTER", "CROSS", "GROUP", "BY", "ORDER", "HAVING", "LIMIT", "OFFSET", "DISTINCT", "ASC",
  "DESC", "CASE", "WHEN", "THEN", "ELSE", "END", "UNION", "ALL", "EXISTS", "INSERT", "INTO", "VALUES", "UPDATE", "SET",
  "DELETE", "CREATE", "TABLE", "WITH", "TRUE", "FALSE", "TOP", "ANY", "SOME",
]);
const FUNCIONES_SQL = [
  "COUNT", "SUM", "AVG", "MIN", "MAX", "ROUND", "UPPER", "LOWER", "LENGTH", "LEN", "COALESCE", "ABS", "SUBSTRING",
  "SUBSTR", "TRIM", "REPLACE", "CAST", "CONCAT", "IFNULL", "NOW", "YEAR", "MONTH", "DAY", "DATE",
];
// Las planillas en español usan otros nombres: es el error más común al pasar de Excel a SQL.
const FUNCIONES_DE_PLANILLA: Record<string, string> = {
  SUMA: "SUM",
  PROMEDIO: "AVG",
  CONTAR: "COUNT",
  CONTARA: "COUNT",
  REDONDEAR: "ROUND",
  MAYUSC: "UPPER",
  MINUSC: "LOWER",
  LARGO: "LENGTH",
  ESPACIOS: "TRIM",
  SI: "CASE WHEN … THEN … ELSE … END",
};
const CLAUSULAS_PRINCIPALES = ["SELECT", "FROM", "WHERE", "GROUP", "ORDER", "HAVING", "LIMIT", "JOIN", "INNER", "LEFT", "DISTINCT", "BETWEEN", "LIKE", "DESC"];
const TRAS_LISTA = new Set(["FROM", "WHERE", "GROUP", "ORDER", "HAVING", "LIMIT"]);
const ORDEN_CLAUSULAS = "Revisa que las palabras clave vayan en orden: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT.";

export function tokensSql(consulta: string): TokenSql[] {
  const tokens: TokenSql[] = [];
  let linea = 1;
  let i = 0;
  while (i < consulta.length) {
    const caracter = consulta[i];
    const resto = consulta.slice(i);
    if (caracter === "\n") {
      linea += 1;
      i += 1;
    } else if (/\s/.test(caracter)) {
      i += 1;
    } else if (resto.startsWith("--")) {
      while (i < consulta.length && consulta[i] !== "\n") i += 1;
    } else if (resto.startsWith("/*")) {
      const fin = consulta.indexOf("*/", i + 2);
      const hasta = fin === -1 ? consulta.length : fin + 2;
      linea += (consulta.slice(i, hasta).match(/\n/g) ?? []).length;
      i = hasta;
    } else if (caracter === "'" || caracter === '"') {
      const inicio = i;
      const lineaInicio = linea;
      i += 1;
      while (i < consulta.length && consulta[i] !== caracter) {
        if (consulta[i] === "\n") linea += 1;
        i += 1;
      }
      const abierto = i >= consulta.length;
      if (!abierto) i += 1;
      tokens.push({ tipo: "texto", valor: consulta.slice(inicio, i), linea: lineaInicio, abierto });
    } else {
      const palabra = /^(?:[A-Za-z_À-ſ][\wÀ-ſ]*|`[^`]*`)/.exec(resto);
      const numero = /^\d+(?:\.\d+)?/.exec(resto);
      const simbolo = /^(?:<>|<=|>=|!=|==|\|\|)/.exec(resto);
      if (palabra) tokens.push({ tipo: "palabra", valor: palabra[0].replace(/`/g, ""), linea });
      else if (numero) tokens.push({ tipo: "numero", valor: numero[0], linea });
      else tokens.push({ tipo: "simbolo", valor: simbolo ? simbolo[0] : caracter, linea });
      i += (palabra ?? numero ?? simbolo)?.[0].length ?? 1;
    }
  }
  return tokens;
}

export function esquemaDe(tablas: Tablas): EsquemaSql {
  return Object.fromEntries(Object.entries(tablas).map(([tabla, filas]) => [tabla, Object.keys(filas[0] ?? {})]));
}

const esPalabra = (token: TokenSql | undefined, ...valores: string[]) =>
  token?.tipo === "palabra" && (valores.length === 0 || valores.includes(token.valor.toUpperCase()));
const esSimbolo = (token: TokenSql | undefined, valor: string) => token?.tipo === "simbolo" && token.valor === valor;
const esClave = (token: TokenSql | undefined) => token?.tipo === "palabra" && PALABRAS_CLAVE.has(token.valor.toUpperCase());
const esFuncion = (tokens: TokenSql[], indice: number) => esSimbolo(tokens[indice + 1], "(");

type Alcance = { tablas: Map<string, string>; alias: Set<string> };

// Primera pasada: qué nombres son tablas (o sus alias) y cuáles son alias de columnas.
function alcanceDe(tokens: TokenSql[], esquema: EsquemaSql): Alcance {
  const tablas = new Map<string, string>(Object.keys(esquema).map((tabla) => [tabla.toLowerCase(), tabla]));
  const alias = new Set<string>();
  tokens.forEach((token, indice) => {
    if (token.tipo !== "palabra" || esClave(token) || esFuncion(tokens, indice)) return;
    const previo = tokens[indice - 1];
    const tablaPrevia = (t: TokenSql | undefined) => (t?.tipo === "palabra" ? esquema[t.valor] && t.valor : undefined);
    if (esPalabra(previo, "AS")) {
      const tabla = tablaPrevia(tokens[indice - 2]);
      if (tabla) tablas.set(token.valor.toLowerCase(), tabla);
      else alias.add(token.valor.toLowerCase());
      return;
    }
    const tabla = tablaPrevia(previo);
    if (tabla) {
      tablas.set(token.valor.toLowerCase(), tabla);
      return;
    }
    const siguiente = tokens[indice + 1];
    const antesEsValor = (previo?.tipo === "palabra" && !esClave(previo)) || esSimbolo(previo, ")");
    const despuesTermina = !siguiente || esSimbolo(siguiente, ",") || esPalabra(siguiente, "FROM");
    if (antesEsValor && despuesTermina && !esSimbolo(tokens[indice - 2], ".")) alias.add(token.valor.toLowerCase());
  });
  return { tablas, alias };
}

function lineaDe(tokens: TokenSql[], valor: string): number | null {
  return tokens.find((token) => token.tipo === "palabra" && token.valor === valor)?.linea ?? null;
}

function sugerencia(nombre: string | null): string | null {
  return nombre ? `¿Quisiste decir «${nombre}»?` : null;
}

function calificadorDesconocido(tokens: TokenSql[], alcance: Alcance): TokenSql | null {
  return (
    tokens.find(
      (token, indice) =>
        token.tipo === "palabra" && esSimbolo(tokens[indice + 1], ".") && !alcance.tablas.has(token.valor.toLowerCase())
    ) ?? null
  );
}

const FALTANTES: Record<string, [string, string]> = {
  SELECT: ["Después de SELECT faltan las columnas.", "Por ejemplo: SELECT nombre, ciudad FROM clientes"],
  WHERE: ["Después de WHERE falta la condición.", "Por ejemplo: WHERE ciudad = 'Santiago'"],
  "GROUP BY": ["Después de GROUP BY falta la columna para agrupar.", "Por ejemplo: GROUP BY ciudad"],
  "ORDER BY": ["Después de ORDER BY falta la columna para ordenar.", "Por ejemplo: ORDER BY monto DESC"],
  HAVING: ["Después de HAVING falta la condición sobre cada grupo.", "Por ejemplo: HAVING COUNT(*) > 1"],
  ON: ["Después de ON falta la condición que une las tablas.", "Por ejemplo: ON ventas.cliente_id = clientes.id"],
  AND: ["Después de AND falta otra condición.", "Por ejemplo: AND monto > 100000"],
  OR: ["Después de OR falta otra condición.", "Por ejemplo: OR ciudad = 'Temuco'"],
  JOIN: ["Después de JOIN falta la tabla que quieres unir.", "Por ejemplo: JOIN ventas ON ventas.cliente_id = clientes.id"],
  LIMIT: ["LIMIT necesita un número.", "Por ejemplo: LIMIT 10"],
};

type Explicacion = Omit<ErrorExplicado, "original">;

function errorDeSintaxis(tokens: TokenSql[], esquema: EsquemaSql, original: string, lineaParser: number): Explicacion {
  const abierto = tokens.find((token) => token.tipo === "texto" && token.abierto);
  if (abierto) {
    return { mensaje: "Hay una comilla sin cerrar.", sugerencia: "Los textos van entre comillas simples y se cierran con la misma comilla: 'Santiago'.", linea: abierto.linea };
  }

  const abiertos: TokenSql[] = [];
  for (const token of tokens) {
    if (esSimbolo(token, "(")) abiertos.push(token);
    if (esSimbolo(token, ")") && !abiertos.pop()) {
      return { mensaje: "Sobra un paréntesis de cierre «)».", sugerencia: "Cada «)» necesita un «(» antes.", linea: token.linea };
    }
  }
  if (abiertos.length > 0) {
    return { mensaje: "Falta cerrar un paréntesis.", sugerencia: "Cada «(» necesita su «)».", linea: abiertos.at(-1)?.linea ?? null };
  }

  const coma = tokens.findIndex((token, indice) => esSimbolo(token, ",") && (!tokens[indice + 1] || esPalabra(tokens[indice + 1], ...TRAS_LISTA)));
  if (coma !== -1) {
    const siguiente = tokens[coma + 1];
    return {
      mensaje: siguiente ? `Sobra una coma antes de ${siguiente.valor.toUpperCase()}.` : "Sobra una coma al final de la consulta.",
      sugerencia: "La última columna de la lista no lleva coma.",
      linea: tokens[coma].linea,
    };
  }

  const limite = tokens.findIndex((token, indice) => esPalabra(token, "LIMIT") && tokens[indice + 1] && tokens[indice + 1].tipo !== "numero");
  if (limite !== -1) {
    const [mensaje, ejemplo] = FALTANTES.LIMIT;
    return { mensaje, sugerencia: ejemplo, linea: tokens[limite].linea };
  }

  const significativos = tokens.filter((token) => !esSimbolo(token, ";"));
  const ultimo = significativos.at(-1);
  if (ultimo?.tipo === "palabra") {
    const clave = ultimo.valor.toUpperCase();
    const previo = significativos.at(-2)?.valor.toUpperCase();
    const nombre = clave === "BY" && (previo === "GROUP" || previo === "ORDER") ? `${previo} BY` : clave;
    if (nombre === "FROM") {
      return { mensaje: "Después de FROM falta el nombre de la tabla.", sugerencia: `Las tablas de este caso son: ${Object.keys(esquema).join(", ")}.`, linea: ultimo.linea };
    }
    const faltante = FALTANTES[nombre];
    if (faltante) return { mensaje: faltante[0], sugerencia: faltante[1], linea: ultimo.linea };
  }

  const columnas = new Set(Object.values(esquema).flat());
  for (const [indice, token] of tokens.entries()) {
    if (token.tipo !== "palabra" || token.valor.length < 4 || esClave(token) || esFuncion(tokens, indice)) continue;
    // Los alias no se excluyen: en «FROM clientes WHER ciudad» alasql toma WHER como alias de clientes.
    if (columnas.has(token.valor) || esquema[token.valor]) continue;
    const parecida = sugerirNombre(token.valor.toUpperCase(), CLAUSULAS_PRINCIPALES);
    if (parecida) return { mensaje: `«${token.valor}» no es una palabra de SQL.`, sugerencia: `¿Quisiste decir ${parecida}?`, linea: token.linea };
  }

  const fragmento = original.split("\n")[1]?.replace(/^\.\.\./, "").trim() ?? "";
  return { mensaje: `SQL no entiende la consulta cerca de: «${fragmento}».`, sugerencia: ORDEN_CLAUSULAS, linea: lineaParser };
}

export function explicarErrorSql(consulta: string, original: string, tablas: Tablas): ErrorExplicado {
  if (original === "Escribe una consulta antes de ejecutar.") return errorSimple(original, original);
  const esquema = esquemaDe(tablas);
  const tokens = tokensSql(consulta);
  const alcance = alcanceDe(tokens, esquema);

  // «SELEC nombre ...» no empieza con SELECT, así que ejecutarSql lo rechaza antes de que alasql lo lea.
  if (original === "En esta tarea solo puedes usar consultas SELECT.") {
    const primera = tokens[0];
    const parecida = primera?.tipo === "palabra" ? sugerirNombre(primera.valor.toUpperCase(), ["SELECT", "WITH"]) : null;
    if (primera && parecida) {
      return { mensaje: `«${primera.valor}» no es una palabra de SQL.`, sugerencia: `¿Quisiste decir ${parecida}?`, linea: primera.linea, original };
    }
    return errorSimple(original, original);
  }

  const tabla = /^Table does not exist: (\S+)/.exec(original)?.[1];
  if (tabla) {
    const parecida = sugerirNombre(tabla, Object.keys(esquema));
    const mayusculas = parecida?.toLowerCase() === tabla.toLowerCase() ? " Los nombres distinguen mayúsculas y minúsculas." : "";
    return {
      mensaje: `No existe una tabla llamada «${tabla}».`,
      sugerencia: parecida ? `${sugerencia(parecida)}${mayusculas}` : `Las tablas de este caso son: ${Object.keys(esquema).join(", ")}.`,
      linea: lineaDe(tokens, tabla),
      original,
    };
  }

  const funcion = /alasql\.fn\.(\w+) is not a function/.exec(original)?.[1];
  if (funcion) {
    const enSql = FUNCIONES_DE_PLANILLA[funcion.toUpperCase()];
    const parecida = sugerirNombre(funcion.toUpperCase(), FUNCIONES_SQL);
    return {
      mensaje: `SQL no conoce la función ${funcion}.`,
      sugerencia: enSql ? `En SQL se escribe ${enSql}. ${funcion} es el nombre en las planillas en español.` : parecida ? `¿Quisiste decir ${parecida}?` : null,
      linea: lineaDe(tokens, funcion),
      original,
    };
  }

  if (/^Cannot read properties of undefined/.test(original)) {
    const desconocido = calificadorDesconocido(tokens, alcance);
    if (desconocido) {
      return {
        mensaje: `«${desconocido.valor}» no es una tabla ni un alias de esta consulta.`,
        sugerencia: sugerencia(sugerirNombre(desconocido.valor, alcance.tablas.keys())) ?? "Revisa el nombre que va antes del punto, como en clientes.nombre.",
        linea: desconocido.linea,
        original,
      };
    }
  }

  const sintaxis = /^Parse error on line (\d+)/.exec(original);
  if (sintaxis) return { ...errorDeSintaxis(tokens, esquema, original, Number(sintaxis[1])), original };

  return {
    mensaje: "La consulta no se pudo ejecutar.",
    sugerencia: "Revisa la consulta por partes: primero SELECT y FROM, y después agrega lo demás.",
    linea: null,
    original,
  };
}

function apareceEnDatos(tablas: Tablas, valor: string): boolean {
  const buscado = valor.toLowerCase();
  return Object.values(tablas).some((filas) => filas.some((fila) => Object.values(fila).some((dato) => typeof dato === "string" && dato.toLowerCase() === buscado)));
}

export function avisosSql(consulta: string, tablas: Tablas): Aviso[] {
  const esquema = esquemaDe(tablas);
  const tokens = tokensSql(consulta);
  const alcance = alcanceDe(tokens, esquema);
  const usadas = [...new Set(alcance.tablas.values())].filter((tabla) => tokens.some((token) => token.tipo === "palabra" && token.valor === tabla));
  const columnas = [...new Set((usadas.length ? usadas : Object.keys(esquema)).flatMap((tabla) => esquema[tabla]))];
  const avisos = new Map<string, Aviso>();
  const avisar = (mensaje: string, linea: number) => {
    if (!avisos.has(mensaje)) avisos.set(mensaje, { mensaje, linea });
  };

  tokens.forEach((token, indice) => {
    if (token.tipo !== "palabra" || esClave(token) || esFuncion(tokens, indice)) return;
    const nombre = token.valor;
    const minuscula = nombre.toLowerCase();
    if (esSimbolo(tokens[indice + 1], ".")) {
      if (!alcance.tablas.has(minuscula)) avisar(`«${nombre}» no es una tabla ni un alias de esta consulta.`, token.linea);
      return;
    }
    if (esSimbolo(tokens[indice - 1], ".")) {
      const tabla = alcance.tablas.get(tokens[indice - 2]?.valor.toLowerCase() ?? "");
      if (tabla && !esquema[tabla].includes(nombre)) {
        const parecida = sugerirNombre(nombre, esquema[tabla]);
        avisar(`La tabla ${tabla} no tiene la columna «${nombre}».${parecida ? ` ¿Quisiste decir «${parecida}»?` : ""}`, token.linea);
      }
      return;
    }
    if (esquema[nombre] || alcance.tablas.has(minuscula) || alcance.alias.has(minuscula) || columnas.includes(nombre)) return;
    const mismaColumna = columnas.find((columna) => columna.toLowerCase() === minuscula);
    if (mismaColumna) {
      avisar(`Las columnas distinguen mayúsculas y minúsculas: escribe «${mismaColumna}» en vez de «${nombre}».`, token.linea);
    } else if (apareceEnDatos(tablas, nombre)) {
      avisar(`«${nombre}» parece un texto: escríbelo entre comillas simples, '${nombre}'.`, token.linea);
    } else {
      const parecida = sugerirNombre(nombre, columnas);
      avisar(`No existe la columna «${nombre}» en las tablas de esta consulta.${parecida ? ` ¿Quisiste decir «${parecida}»?` : ""}`, token.linea);
    }
  });
  return [...avisos.values()];
}
