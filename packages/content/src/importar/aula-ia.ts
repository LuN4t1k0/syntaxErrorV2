import { corregirTildes, type Leccion } from "./leccion";

// Adaptador del aula de IA para datos de la v1 (aula-ia-datos/src/data/lessons.js, exportado a JSON).
// Cada lección tiene un objetivo, una explicación, conceptos, un caso de ejemplo y un quiz de opción única (en
// lessonEnhancements). El quiz pasa a ser un QuizTask: se aprueba con todas las respuestas correctas, como en la v1.

export type LeccionIaV1 = { slug: string; title: string; objective: string; explanation: string[] };
export type PreguntaIaV1 = { question: string; options: string[]; answerIndex: number; explanation: string };
export type MejoraIaV1 = { concepts?: string[]; caseStudy?: string; activity: { questions: PreguntaIaV1[]; hint?: string } };

// Las lecciones de la v1 no traen duración: el quiz y la lectura toman unos 10 minutos.
const MINUTOS = 10;

export function convertirLeccionIa(v1: LeccionIaV1, mejora: MejoraIaV1 | undefined, numero: number): Leccion {
  if (!mejora?.activity.questions.length) throw new Error(`La lección ${v1.slug} no tiene quiz`);
  const texto = (valor: string) => corregirTildes(valor);
  const secciones = [
    ...(mejora.concepts?.length ? [{ titulo: "Conceptos clave", parrafos: [], ejemplo: null, lista: mejora.concepts.map(texto) }] : []),
    ...(mejora.caseStudy ? [{ titulo: "Un caso", parrafos: [texto(mejora.caseStudy)], ejemplo: null }] : []),
  ];
  return {
    slug: `${String(numero).padStart(2, "0")}-${v1.slug}`,
    titulo: texto(v1.title),
    minutos: MINUTOS,
    intro: [`**Objetivo:** ${texto(v1.objective)}`, ...v1.explanation.map(texto)],
    sintaxis: null,
    secciones,
    tarea: {
      tipo: "QuizTask",
      id: v1.slug,
      preguntas: mejora.activity.questions.map((pregunta) => ({
        pregunta: texto(pregunta.question),
        opciones: pregunta.options.map(texto),
        correcta: pregunta.answerIndex,
        explicacion: texto(pregunta.explanation),
      })),
      pistas: mejora.activity.hint ? [texto(mejora.activity.hint)] : [],
    },
    cierre: null,
  };
}
