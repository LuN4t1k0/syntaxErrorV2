import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { tareasDeMision } from "./publicacion";
import type { Contenido } from "./tipos";
import { revisarCodigo, type CodigoDeTarea, type RevisorPython } from "./validar";

// Un intento equivocado típico de una tarea y un trozo del mensaje que tiene que recibir. Viven en
// content/casos/<caso>/intentos.yaml, agrupados por misión y por tarea. Son las pruebas de la enseñanza: si un cambio en
// una tarea o en un motor hace que un error típico apruebe, o que su mensaje deje de explicarlo, el informe lo muestra.
export type Intento = { codigo: CodigoDeTarea; espera: string };
type ArchivoIntentos = Record<string, Record<string, Intento[]>>;

export type ResultadoIntento = { caso: string; mision: string; tarea: string; espera: string; aprobada: boolean; diagnostico: string | null; ok: boolean };
export type ResumenCaso = { caso: string; tareasDeCodigo: number; conIntentos: number; intentos: number; correctos: number };
export type InformeIntentos = { resultados: ResultadoIntento[]; problemas: string[]; resumen: ResumenCaso[] };

const TIPOS_CON_CODIGO = new Set(["SqlTask", "PythonTask", "SheetTask"]);

async function leerIntentos(archivo: string): Promise<ArchivoIntentos> {
  try {
    return (parse(await readFile(archivo, "utf8")) as ArchivoIntentos | null) ?? {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

export async function revisarIntentos(contenido: Contenido, dirContenido: string, { revisarPython }: { revisarPython: RevisorPython }): Promise<InformeIntentos> {
  const resultados: ResultadoIntento[] = [];
  const problemas: string[] = [];
  const resumen: ResumenCaso[] = [];
  for (const caso of contenido.casos) {
    const donde = `casos/${caso.slug}/intentos.yaml`;
    const archivo = await leerIntentos(path.join(dirContenido, donde));
    const tareasDeCodigo = caso.misiones.flatMap((mision) => tareasDeMision(mision)).filter((tarea) => TIPOS_CON_CODIGO.has(tarea.tipo)).length;
    const fila: ResumenCaso = { caso: caso.slug, tareasDeCodigo, conIntentos: 0, intentos: 0, correctos: 0 };
    for (const [slugMision, porTarea] of Object.entries(archivo)) {
      const mision = caso.misiones.find((candidata) => candidata.slug === slugMision);
      if (!mision) {
        problemas.push(`${donde}: no existe la misión ${slugMision}`);
        continue;
      }
      for (const [idTarea, intentos] of Object.entries(porTarea)) {
        const tarea = tareasDeMision(mision).find((candidata) => candidata.props.id === idTarea);
        if (!tarea || !TIPOS_CON_CODIGO.has(tarea.tipo)) {
          problemas.push(`${donde}: la misión ${slugMision} no tiene una tarea de código con id "${idTarea}"`);
          continue;
        }
        fila.conIntentos += 1;
        for (const intento of intentos) {
          let resultado;
          try {
            resultado = await revisarCodigo(tarea, caso, intento.codigo, revisarPython);
          } catch (error) {
            resultado = { aprobada: false, diagnostico: error instanceof Error ? error.message : String(error) };
          }
          const aprobada = resultado?.aprobada ?? false;
          const diagnostico = resultado?.diagnostico ?? null;
          const ok = !aprobada && (diagnostico ?? "").includes(intento.espera);
          fila.intentos += 1;
          if (ok) fila.correctos += 1;
          resultados.push({ caso: caso.slug, mision: slugMision, tarea: idTarea, espera: intento.espera, aprobada, diagnostico, ok });
        }
      }
    }
    if (fila.tareasDeCodigo > 0) resumen.push(fila);
  }
  return { resultados, problemas, resumen };
}
