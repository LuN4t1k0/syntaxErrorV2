import { revisarMarkdown } from "@syntaxerror/engines/markdown";
import { revisarQuiz } from "@syntaxerror/engines/quiz";
import { aplicarSolucion, revisarHoja } from "@syntaxerror/engines/sheet";
import { revisarSql } from "@syntaxerror/engines/sql";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { hojaDeTarea, tablasSql } from "./datos";
import type { BloqueTarea, PropsBloque } from "./esquemas";
import { tareasDeMision } from "./publicacion";
import type { Caso, Contenido } from "./tipos";

export type RevisorPython = (tarea: PropsBloque<"PythonTask">, caso: Caso) => Promise<ResultadoTarea>;

const MAXIMO_PALABRAS_BRIEF = 150;
const BLOQUES_DE_GUIA = new Set(["Concepto", "SqlEjemplo", "PythonEjemplo", "Sintaxis"]);

// Para comparar una pista con la solución sin que importen los espacios, el punto y coma final ni las mayúsculas.
const normalizarCodigo = (codigo: string) => codigo.replace(/\s+/g, " ").replace(/;\s*$/, "").trim().toLowerCase();

// Las pistas orientan; la respuesta la escribe la persona (propuesta pedagógica, sección 6). Las aulas de la v1 tenían
// pistas con la consulta completa: esta regla evita que se cuelen al importarlas.
function pistaConSolucion(tarea: BloqueTarea): string | undefined {
  if (tarea.tipo !== "SqlTask" && tarea.tipo !== "PythonTask") return undefined;
  const solucion = normalizarCodigo(tarea.props.solucion);
  return tarea.props.pistas.find((pista) => normalizarCodigo(pista).includes(solucion));
}

function contarPalabras(texto: string): number {
  return texto.split(/\s+/).filter(Boolean).length;
}

async function revisarSolucion(tarea: BloqueTarea, caso: Caso, revisarPython: RevisorPython): Promise<ResultadoTarea> {
  switch (tarea.tipo) {
    case "SqlTask": {
      const tablas = tablasSql(caso);
      if (Object.keys(tablas).length === 0) return { aprobada: false, diagnostico: "el caso no tiene tablas en datos/" };
      return revisarSql(tablas, tarea.props, tarea.props.solucion);
    }
    case "SheetTask": {
      if (tarea.props.hoja && tarea.props.otras.includes(tarea.props.hoja)) return { aprobada: false, diagnostico: `la hoja ${tarea.props.hoja} no puede ser también una hoja de consulta` };
      const { grilla, opciones } = hojaDeTarea(caso, tarea.props);
      return revisarHoja(aplicarSolucion(grilla, tarea.props.solucion, opciones), tarea.props);
    }
    case "PythonTask":
      return revisarPython(tarea.props, caso);
    case "MarkdownTask":
      return revisarMarkdown(tarea.props.solucion, tarea.props.requisitos);
    case "GithubTask":
      // Se revisa contra el repositorio de cada persona: no hay una solución que validar de antemano.
      return { aprobada: true, diagnostico: null };
    case "LecturaTask":
      // Una lectura se completa al marcarla: no hay solución que validar.
      return { aprobada: true, diagnostico: null };
    case "QuizTask":
      // Responder la opción correcta de cada pregunta tiene que aprobar el quiz.
      return revisarQuiz(tarea.props.preguntas, tarea.props.preguntas.map((pregunta) => pregunta.correcta));
  }
}

export async function validarContenido(contenido: Contenido, { revisarPython }: { revisarPython: RevisorPython }): Promise<string[]> {
  const problemas: string[] = [];
  for (const caso of contenido.casos) {
    for (const mision of caso.misiones) {
      const donde = `casos/${caso.slug}/misiones/${mision.slug}.mdx`;
      const tareas = tareasDeMision(mision);
      if (tareas.length === 0) problemas.push(`${donde}: la misión no tiene ninguna tarea práctica (SqlTask, PythonTask, SheetTask, MarkdownTask, GithubTask, LecturaTask o QuizTask)`);
      for (const bloque of mision.bloques) {
        if (bloque.tipo !== "Brief") continue;
        const palabras = contarPalabras(bloque.texto ?? "");
        if (palabras > MAXIMO_PALABRAS_BRIEF) problemas.push(`${donde}: el Brief tiene ${palabras} palabras (máximo ${MAXIMO_PALABRAS_BRIEF})`);
      }
      const vistos = new Set<string>();
      for (const tarea of tareas) {
        if (vistos.has(tarea.props.id)) problemas.push(`${donde}: el id de tarea "${tarea.props.id}" está repetido`);
        vistos.add(tarea.props.id);
      }
      if (mision.sinGuia) {
        for (const bloque of mision.bloques) {
          if (BLOQUES_DE_GUIA.has(bloque.tipo)) problemas.push(`${donde}: una misión sin guía no puede tener <${bloque.tipo}>`);
        }
        for (const tarea of tareas) {
          if (tarea.props.pistas.length > 0) problemas.push(`${donde}: una misión sin guía no puede tener pistas (tarea "${tarea.props.id}")`);
        }
      }
      for (const tarea of tareas) {
        if (pistaConSolucion(tarea)) problemas.push(`${donde}: una pista de la tarea "${tarea.props.id}" trae la solución completa`);
        let resultado: ResultadoTarea;
        try {
          resultado = await revisarSolucion(tarea, caso, revisarPython);
        } catch (error) {
          resultado = { aprobada: false, diagnostico: error instanceof Error ? error.message : String(error) };
        }
        if (!resultado.aprobada) {
          problemas.push(`${donde}: la solución de la tarea "${tarea.props.id}" no pasa su propio validador: ${resultado.diagnostico ?? "sin detalle"}`);
        }
      }
    }
    const publicado = contenido.rutas.some((ruta) => ruta.estado === "publicada" && ruta.casos.includes(caso.slug));
    const ultima = caso.misiones.at(-1);
    // En unas clases no se exige: el caso que viene después hace de misión sin guía.
    if (publicado && caso.tipo === "caso" && ultima && !ultima.sinGuia) {
      problemas.push(`casos/${caso.slug}: la última misión (${ultima.slug}) debe ser sin guía: agrega sinGuia: true a su frontmatter`);
    }
  }
  return problemas;
}
