import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { aCsv } from "../generadores/despachos-rapidos";
import { convertirLeccionSql, datosSql, identificadores, type AulaV1 } from "./aula-sql";
import { leccionAMdx } from "./leccion";

// Escribe el borrador de unas clases a partir de un aula de la v1 exportada a JSON (scripts/exportar-aula-v1.mjs).
// Uso: pnpm --filter @syntaxerror/content importar sql <aula.json> <carpeta de destino> <lecciones separadas por coma>
// Escribe misiones/NN-<lección>.mdx, datos/<tabla>.csv con las tablas que usan y un caso.yaml para completar.
// No pisa contenido: la carpeta de destino no debe existir. Después del borrador viene la revisión editorial.

const [aula, entrada, destino, seleccion] = process.argv.slice(2);
if (aula !== "sql" || !entrada || !destino || !seleccion) {
  console.error("Uso: importar sql <aula.json> <carpeta de destino> <lección,lección,...>");
  process.exit(1);
}

const datos = JSON.parse(await readFile(entrada, "utf8")) as AulaV1;
const excepto = identificadores(datos);
const lecciones = seleccion
  .split(",")
  .map((slug) => slug.trim())
  .filter(Boolean)
  .map((slug, indice) => {
    const v1 = datos.lessons.find((leccion) => leccion.slug === slug);
    if (!v1) throw new Error(`El aula no tiene la lección ${slug}`);
    return { leccion: convertirLeccionSql(v1, indice + 1, excepto), tablas: v1.datasetTables ?? [] };
  });

if (existsSync(destino)) throw new Error(`${destino} ya existe: el importador no pisa contenido`);
await mkdir(path.join(destino, "misiones"), { recursive: true });
await mkdir(path.join(destino, "datos"), { recursive: true });
for (const { leccion } of lecciones) await writeFile(path.join(destino, "misiones", `${leccion.slug}.mdx`), leccionAMdx(leccion));
const tablas = [...new Set(lecciones.flatMap(({ tablas: usadas }) => usadas))].sort();
for (const [tabla, filas] of Object.entries(datosSql(datos, tablas))) await writeFile(path.join(destino, "datos", `${tabla}.csv`), aCsv(filas));
await writeFile(
  path.join(destino, "caso.yaml"),
  `slug: ${path.basename(destino)}\ntipo: clases\ntitulo: "Clases de SQL"\ndataset: "Completar: qué datos de práctica usan las lecciones"\nmisiones:\n${lecciones.map(({ leccion }) => `  - ${leccion.slug}`).join("\n")}\n`
);
console.log(`[importar] ${lecciones.length} lecciones y ${tablas.length} tablas en ${destino}`);
