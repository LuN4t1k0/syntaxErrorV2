import { corregirTildes, type Leccion } from "./leccion";

// Adaptador del aula de SQL de la v1 (aula-sql/src/data/lessons.js y datasets.js, exportados a JSON).

export type SeccionV1 = { heading: string; body: string[]; code: string | null };
export type LeccionSqlV1 = {
  slug: string;
  title: string;
  duration: string;
  type: string;
  intro?: string[];
  syntaxExample?: string | null;
  datasetTables?: string[];
  sections?: SeccionV1[];
  starter?: string;
  expected?: string;
  prompt?: string;
  explanation?: string;
  hint?: string;
};
export type AulaV1 = { lessons: LeccionSqlV1[]; datasets: Record<string, Record<string, string | number | null>[]> };

// Nombres propios y valores de los datos de práctica que la v1 escribió sin tilde. Se corrigen en todas partes,
// también dentro de las consultas, para que los datos y los ejercicios calcen.
export const NOMBRES_SQL: Record<string, string> = {
  Concepcion: "Concepción",
  Valparaiso: "Valparaíso",
  Perez: "Pérez",
  Martin: "Martín",
  Diaz: "Díaz",
  Nicolas: "Nicolás",
  Sofia: "Sofía",
  Tomas: "Tomás",
  Analitica: "Analítica",
  Basico: "Básico",
};

export function corregirNombres(texto: string): string {
  return texto.replace(/\b[A-Z][a-z]+\b/g, (palabra) => NOMBRES_SQL[palabra] ?? palabra);
}

const normalizar = (codigo: string) => codigo.replace(/\s+/g, " ").replace(/;\s*$/, "").trim().toLowerCase();

// Las pistas de la v1 suelen traer la consulta completa o casi: esas no se importan (la revisión escribe pistas que
// orienten sin dar la respuesta).
export function pistaUtil(pista: string | undefined, solucion: string): string[] {
  if (!pista) return [];
  return normalizar(pista).includes(normalizar(solucion)) || /\bselect\b.*\bfrom\b/i.test(pista) ? [] : [pista];
}

// Las tablas y columnas se escriben sin tilde: el diccionario de tildes no las toca.
export function identificadores(aula: AulaV1): Set<string> {
  const nombres = new Set<string>();
  for (const [tabla, filas] of Object.entries(aula.datasets)) {
    nombres.add(tabla.toLowerCase());
    for (const fila of filas) for (const columna of Object.keys(fila)) nombres.add(columna.toLowerCase());
  }
  return nombres;
}

export function convertirLeccionSql(v1: LeccionSqlV1, numero: number, excepto: ReadonlySet<string>): Leccion {
  if (v1.type !== "exercise-select" || !v1.expected || !v1.prompt) {
    throw new Error(`La lección ${v1.slug} no es un ejercicio de consulta (${v1.type}): este adaptador solo importa SELECT`);
  }
  const texto = (valor: string) => corregirTildes(corregirNombres(valor), excepto);
  const solucion = corregirNombres(v1.expected);
  return {
    slug: `${String(numero).padStart(2, "0")}-${v1.slug}`,
    titulo: texto(v1.title),
    minutos: Number.parseInt(v1.duration, 10) || 15,
    intro: (v1.intro ?? []).map(texto),
    sintaxis: v1.syntaxExample ? { lenguaje: "sql", codigo: v1.syntaxExample } : null,
    secciones: (v1.sections ?? []).map((seccion) => ({
      titulo: texto(seccion.heading),
      parrafos: seccion.body.map(texto),
      ejemplo: seccion.code ? corregirNombres(seccion.code) : null,
    })),
    tarea: {
      tipo: "SqlTask",
      id: v1.slug,
      enunciado: texto(v1.prompt),
      inicial: corregirNombres(v1.starter ?? ""),
      solucion,
      comparar: /\border\s+by\b/i.test(solucion) ? "filas-en-orden" : "filas-sin-orden",
      pistas: pistaUtil(v1.hint, solucion).map(texto),
    },
    cierre: v1.explanation ? texto(v1.explanation) : null,
  };
}

// Los datos de práctica, con los nombres corregidos, listos para escribirse como CSV en datos/.
export function datosSql(aula: AulaV1, tablas: string[]): Record<string, Record<string, string | number | null>[]> {
  return Object.fromEntries(
    tablas.map((tabla) => {
      const filas = aula.datasets[tabla];
      if (!filas) throw new Error(`El aula no tiene la tabla ${tabla}`);
      return [tabla, filas.map((fila) => Object.fromEntries(Object.entries(fila).map(([columna, valor]) => [columna, typeof valor === "string" ? corregirNombres(valor) : valor])))];
    })
  );
}
