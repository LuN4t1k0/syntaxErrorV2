import type { ResultadoTarea } from "./tipos";

// Un quiz de opción única, como los de las aulas de la v1: se aprueba con todas las respuestas correctas.
export type PreguntaQuiz = { pregunta: string; opciones: string[]; correcta: number; explicacion: string };

// respuestas[i] es el índice de la opción elegida en la pregunta i (en el orden original), o null si no se respondió.
// El diagnóstico dice cuántas están bien y cuáles revisar, nunca cuál es la correcta.
export function revisarQuiz(preguntas: PreguntaQuiz[], respuestas: (number | null)[]): ResultadoTarea & { incorrectas: number[] } {
  const sinResponder = preguntas.map((_, indice) => indice).filter((indice) => respuestas[indice] === null || respuestas[indice] === undefined);
  if (sinResponder.length > 0) {
    // Responder a medias no es un resultado incorrecto: no cuenta como intento.
    return { aprobada: false, diagnostico: "Responde todas las preguntas antes de validar.", errorDeCodigo: true, incorrectas: [] };
  }
  const incorrectas = preguntas.map((pregunta, indice) => (respuestas[indice] === pregunta.correcta ? -1 : indice)).filter((indice) => indice >= 0);
  if (incorrectas.length === 0) return { aprobada: true, diagnostico: null, incorrectas };
  const buenas = preguntas.length - incorrectas.length;
  const cuales = incorrectas.map((indice) => indice + 1).join(", ");
  return {
    aprobada: false,
    diagnostico: `Tienes ${buenas} de ${preguntas.length} respuestas correctas. Revisa ${incorrectas.length === 1 ? `la pregunta ${cuales}` : `las preguntas ${cuales}`}.`,
    incorrectas,
  };
}
