// Revisa los intentos equivocados de content/casos/*/intentos.yaml y compara con el último registro guardado.
// Uso: pnpm --filter @syntaxerror/content intentos            (solo informa)
//      pnpm --filter @syntaxerror/content intentos --guardar  (además agrega el resultado al historial)
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cargarContenido } from "./cargar";
import { revisarIntentos, type ResumenCaso } from "./intentos";
import { crearRevisorPythonNode } from "./revisor-python";

const dir = process.env.CONTENT_DIR ?? path.resolve(process.cwd(), "../../content");
const HISTORIAL = path.join(dir, "calidad", "intentos.jsonl");

type Registro = { fecha: string; tareasDeCodigo: number; conIntentos: number; intentos: number; correctos: number; casos: ResumenCaso[] };

async function ultimoRegistro(): Promise<Registro | null> {
  try {
    const lineas = (await readFile(HISTORIAL, "utf8")).trim().split("\n").filter(Boolean);
    return lineas.length ? (JSON.parse(lineas.at(-1)!) as Registro) : null;
  } catch {
    return null;
  }
}

const diferencia = (ahora: number, antes: number) => (ahora === antes ? "igual" : `${ahora > antes ? "+" : ""}${ahora - antes}`);

const contenido = await cargarContenido(dir);
const { resultados, problemas, resumen } = await revisarIntentos(contenido, dir, { revisarPython: crearRevisorPythonNode() });
const total = (campo: keyof Omit<ResumenCaso, "caso">) => resumen.reduce((suma, fila) => suma + fila[campo], 0);
const registro: Registro = {
  fecha: new Date().toISOString(),
  tareasDeCodigo: total("tareasDeCodigo"),
  conIntentos: total("conIntentos"),
  intentos: total("intentos"),
  correctos: total("correctos"),
  casos: resumen,
};

console.log("caso                          tareas de código  con intentos  intentos  correctos");
for (const fila of resumen) {
  console.log(`${fila.caso.padEnd(30)}${String(fila.tareasDeCodigo).padStart(16)}${String(fila.conIntentos).padStart(14)}${String(fila.intentos).padStart(10)}${String(fila.correctos).padStart(11)}`);
}
console.log(`${"total".padEnd(30)}${String(registro.tareasDeCodigo).padStart(16)}${String(registro.conIntentos).padStart(14)}${String(registro.intentos).padStart(10)}${String(registro.correctos).padStart(11)}`);

const anterior = await ultimoRegistro();
if (anterior) {
  console.log(
    `\nFrente al registro del ${anterior.fecha.slice(0, 10)}: tareas con intentos ${diferencia(registro.conIntentos, anterior.conIntentos)}, ` +
      `intentos ${diferencia(registro.intentos, anterior.intentos)}, intentos que fallan ${diferencia(registro.intentos - registro.correctos, anterior.intentos - anterior.correctos)}.`
  );
}

const fallidos = resultados.filter((resultado) => !resultado.ok);
for (const fallido of fallidos) {
  const obtuvo = fallido.aprobada ? "APRUEBA" : fallido.diagnostico;
  console.error(`\n✗ ${fallido.caso}/${fallido.mision} (${fallido.tarea})\n  se esperaba: …${fallido.espera}…\n  se obtuvo:   ${obtuvo}`);
}
for (const problema of problemas) console.error(`\n✗ ${problema}`);

if (process.argv.includes("--guardar")) {
  await mkdir(path.dirname(HISTORIAL), { recursive: true });
  await appendFile(HISTORIAL, `${JSON.stringify(registro)}\n`);
  console.log(`\nGuardado en ${path.relative(dir, HISTORIAL)}.`);
}
process.exit(fallidos.length || problemas.length ? 1 : 0);
