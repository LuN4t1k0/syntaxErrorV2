import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { aCsv } from "../generadores/despachos-rapidos";
import { convertirLeccionExcel, type LeccionExcelV1 } from "./aula-excel";
import { convertirLeccionIa, type LeccionIaV1, type MejoraIaV1 } from "./aula-ia";
import { columnasDeDatasets, convertirLeccionPowerBi, type LeccionPowerBiV1 } from "./aula-powerbi";
import { convertirLeccionPython, identificadoresPython, type LeccionPythonV1 } from "./aula-python";
import { convertirLeccionSql, datosSql, identificadores, type AulaV1 } from "./aula-sql";
import { leccionAMdx, type Leccion } from "./leccion";

// Escribe el borrador de unas clases a partir de un aula de la v1 exportada a JSON (scripts/exportar-aula-v1.mjs).
// Uso: pnpm --filter @syntaxerror/content importar <sql|excel|python|powerbi|ia> <aula.json> <carpeta de destino> <lecciones separadas por coma>
// Escribe misiones/NN-<lección>.mdx, un caso.yaml para completar y, en SQL, datos/<tabla>.csv con las tablas que usan
// (en Excel cada lección trae su planilla y en Python, su preparación). En Power BI copia los datasets del aula. No pisa contenido: la carpeta de destino no debe existir. Después del
// borrador viene la revisión editorial.

const AULAS = { sql: "Clases de SQL", excel: "Clases de Excel", python: "Clases de Python", powerbi: "Clases de Power BI", ia: "Clases de IA para datos" } as const;
type Aula = keyof typeof AULAS;

const [aula, entrada, destino, seleccion] = process.argv.slice(2);
if (!(aula in AULAS) || !entrada || !destino || !seleccion) {
  console.error("Uso: importar <sql|excel|python|powerbi|ia> <aula.json> <carpeta de destino> <lección,lección,...>");
  process.exit(1);
}

// Cada aula tiene la forma de sus lecciones: se leen como tales en su rama.
const datos = JSON.parse(await readFile(entrada, "utf8")) as { lessons: { slug: string }[]; datasets: AulaV1["datasets"]; archivos?: Record<string, string>; enhancements?: Record<string, MejoraIaV1> };
const slugs = seleccion.split(",").map((slug) => slug.trim()).filter(Boolean);
const elegidas = slugs.map((slug) => {
  const v1 = datos.lessons.find((leccion) => leccion.slug === slug);
  if (!v1) throw new Error(`El aula no tiene la lección ${slug}`);
  return v1;
});

let lecciones: Leccion[];
let tablas: string[] = [];
if ((aula as Aula) === "sql") {
  const sql = elegidas as AulaV1["lessons"];
  const excepto = identificadores({ lessons: sql, datasets: datos.datasets });
  lecciones = sql.map((v1, indice) => convertirLeccionSql(v1, indice + 1, excepto));
  tablas = [...new Set(sql.flatMap((v1) => v1.datasetTables ?? []))].sort();
} else if ((aula as Aula) === "excel") {
  lecciones = (elegidas as LeccionExcelV1[]).map((v1, indice) => convertirLeccionExcel(v1, indice + 1));
} else if ((aula as Aula) === "ia") {
  lecciones = (elegidas as LeccionIaV1[]).map((v1, indice) => convertirLeccionIa(v1, datos.enhancements?.[v1.slug], indice + 1));
} else if ((aula as Aula) === "powerbi") {
  const excepto = columnasDeDatasets(datos.archivos ?? {});
  lecciones = (elegidas as LeccionPowerBiV1[]).map((v1, indice) => convertirLeccionPowerBi(v1, indice + 1, path.basename(destino), excepto));
} else {
  const python = elegidas as LeccionPythonV1[];
  const excepto = identificadoresPython(python);
  lecciones = python.map((v1, indice) => convertirLeccionPython(v1, indice + 1, excepto));
}

if (existsSync(destino)) throw new Error(`${destino} ya existe: el importador no pisa contenido`);
await mkdir(path.join(destino, "misiones"), { recursive: true });
for (const leccion of lecciones) await writeFile(path.join(destino, "misiones", `${leccion.slug}.mdx`), leccionAMdx(leccion));
if (tablas.length > 0) {
  await mkdir(path.join(destino, "datos"), { recursive: true });
  for (const [tabla, filas] of Object.entries(datosSql({ lessons: [], datasets: datos.datasets }, tablas))) await writeFile(path.join(destino, "datos", `${tabla}.csv`), aCsv(filas));
}
// Los datasets de las prácticas (Power BI) se descargan desde «Datos del caso»: se copian tal cual.
const archivos = (aula as Aula) === "powerbi" ? Object.entries(datos.archivos ?? {}) : [];
if (archivos.length > 0) {
  await mkdir(path.join(destino, "datos"), { recursive: true });
  for (const [nombre, contenido] of archivos) await writeFile(path.join(destino, "datos", nombre), contenido);
}
await writeFile(
  path.join(destino, "caso.yaml"),
  `slug: ${path.basename(destino)}\ntipo: clases\ntitulo: "${AULAS[aula as Aula]}"\ndataset: "Completar: qué datos de práctica usan las lecciones"\nmisiones:\n${lecciones.map((leccion) => `  - ${leccion.slug}`).join("\n")}\n`
);
console.log(`[importar] ${lecciones.length} lecciones y ${tablas.length + archivos.length} tablas en ${destino}`);
