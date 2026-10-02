// Exporta un aula de la v1 a JSON para importarla (packages/content/src/importar), con sus datasets descargables. Corre con el Node del equipo, fuera
// de Docker, porque lee el repositorio de la v1: node packages/content/scripts/exportar-aula-v1.mjs ../cursos/aula-sql
// > tmp/aula-sql.json. Solo lee los módulos de datos del aula (lecciones y datasets); no ejecuta la app.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const aula = process.argv[2];
if (!aula) {
  console.error("Uso: node exportar-aula-v1.mjs <carpeta del aula de la v1>");
  process.exit(1);
}
const modulo = (nombre) => pathToFileURL(path.resolve(aula, "src", "data", nombre)).href;
const lecciones = await import(modulo("lessons.js"));
const datasets = existsSync(path.resolve(aula, "src", "data", "datasets.js")) ? (await import(modulo("datasets.js"))).datasets : {};
// Los CSV que el aula ofrecía para descargar (por ejemplo, las prácticas de Power BI), tal cual.
const carpeta = path.resolve(aula, "public", "datasets");
const archivos = existsSync(carpeta)
  ? Object.fromEntries(readdirSync(carpeta).filter((nombre) => nombre.endsWith(".csv")).sort().map((nombre) => [nombre, readFileSync(path.join(carpeta, nombre), "utf8")]))
  : {};
process.stdout.write(`${JSON.stringify({ modules: lecciones.modules ?? [], lessons: lecciones.lessons, datasets, archivos }, null, 2)}\n`);
