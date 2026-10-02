import { z } from "zod";
import { PATRON_REQUISITO_MARKDOWN } from "@syntaxerror/engines/markdown-requisitos";
import { RUBRICA_BASE } from "./rubrica";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "debe ser un slug en minúsculas con guiones");
const texto = z.string().trim().min(1, "no puede estar vacío");
const idTarea = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "debe ser un id en minúsculas con guiones");
const pistas = z.array(texto).default([]);
const requisitoMarkdown = z.string().regex(PATRON_REQUISITO_MARKDOWN, "requisito de Markdown desconocido (titulo, subtitulos, lista, lista-numerada, tabla, enlace, imagen, negrita o codigo, con :N opcional)");

// Lo que se revisa en un repositorio de GitHub (Caso 0). "readme:<requisito>" revisa el Markdown del README.
export const PATRON_REQUISITO_GITHUB = /^(publico|readme|nombres-limpios|commits:[1-9]|carpeta:[a-z0-9_-]+|extension:\.[a-z0-9]+|readme:[a-z:0-9-]+)$/;
const requisitoGithub = z
  .string()
  .regex(PATRON_REQUISITO_GITHUB, "requisito de GitHub desconocido")
  .refine((requisito) => !requisito.startsWith("readme:") || PATRON_REQUISITO_MARKDOWN.test(requisito.slice("readme:".length)), "requisito de README desconocido");

export const rutaSchema = z.object({
  slug,
  titulo: texto,
  cargo: texto,
  descripcion: texto,
  estado: z.enum(["publicada", "borrador"]),
  casos: z.array(slug).min(1, "la ruta necesita al menos un caso"),
});

// Qué se espera en cada dimensión de la rúbrica estándar, descrito para el entregable del caso.
const rubricaSchema = z.object({ claridad: texto, ejecucion: texto, coherencia: texto }, { invalid_type_error: "la rúbrica describe claridad, ejecucion y coherencia" }).strict();

const casoDeTrabajoSchema = z.object({
  tipo: z.literal("caso"),
  slug,
  titulo: texto,
  cargo: texto,
  empresa: texto,
  dataset: texto,
  entregable: z.string({ required_error: "el caso debe declarar su entregable" }).trim().min(1, "el caso debe declarar su entregable"),
  archivos: z.array(z.string().regex(/^\.[a-z0-9]+$/, "cada archivo requerido es una extensión, por ejemplo .sql")).default([]),
  rubrica: rubricaSchema.default(RUBRICA_BASE),
  misiones: z.array(slug).min(1, "el caso necesita al menos una misión"),
});

// Clases: una lección por tema, traídas de las aulas de la v1, antes del caso que las aplica. No tienen empresa,
// entregable ni rúbrica: se completan al aprobar todas sus lecciones.
const casoDeClasesSchema = z
  .object({
    tipo: z.literal("clases"),
    slug,
    titulo: texto,
    dataset: texto,
    misiones: z.array(slug).min(1, "las clases necesitan al menos una lección"),
  })
  .strict();

// Sin "tipo", es un caso de trabajo: así los caso.yaml anteriores siguen igual.
export const casoSchema = z.preprocess(
  (datos) => (datos && typeof datos === "object" && !("tipo" in datos) ? { ...datos, tipo: "caso" } : datos),
  z.discriminatedUnion("tipo", [casoDeTrabajoSchema, casoDeClasesSchema], { errorMap: () => ({ message: "tipo debe ser caso o clases" }) })
);

export const frontmatterSchema = z.object({
  titulo: texto,
  tiempo: z.number().int().positive(),
  // La misión final de cada caso: sin concepto, ejemplos ni pistas (propuesta pedagógica, sección 5).
  sinGuia: z.boolean().default(false),
});

const nombreHoja = z.string().regex(/^[a-z_][a-z0-9_]*$/, "debe ser el nombre de un CSV de datos/");
// Una celda (F2) o una columna que se rellena hacia abajo desde la primera (F2:F41).
const rangoCeldas = z.string().regex(/^[A-Z]+[1-9][0-9]*(?::[A-Z]+[1-9][0-9]*)?$/, "debe ser una celda como F2 o un rango de una columna como F2:F41");
const contenidoCelda = z.union([z.string(), z.number()]);

const celdaEsperada = z.object({
  celda: z.string().regex(/^[A-Z]+[1-9][0-9]*$/, "debe ser una celda como F2"),
  valor: z.union([z.string(), z.number(), z.boolean()]),
  funcion: z.string().optional(),
});

export const bloqueSchemas = {
  Brief: z.object({ de: texto }),
  Concepto: z.object({}),
  SqlEjemplo: z.object({ consulta: texto }),
  PythonEjemplo: z.object({ codigo: texto }),
  SqlTask: z
    .object({
      id: idTarea,
      enunciado: z.string().optional(),
      inicial: z.string().default(""),
      solucion: texto,
      comparar: z.enum(["filas-en-orden", "filas-sin-orden", "estado-tabla"]),
      verificar: z.string().optional(),
      pistas,
    })
    .refine((tarea) => tarea.comparar !== "estado-tabla" || Boolean(tarea.verificar), {
      message: 'comparar="estado-tabla" necesita la consulta verificar',
      path: ["verificar"],
    }),
  PythonTask: z.object({
    id: idTarea,
    enunciado: z.string().optional(),
    inicial: z.string().default(""),
    preparacion: z.string().default(""),
    solucion: texto,
    pruebas: texto,
    paquetes: z.array(z.enum(["pandas"])).default([]),
    pistas,
  }),
  SheetTask: z
    .object({
      id: idTarea,
      enunciado: z.string().optional(),
      // La planilla sale de un CSV de datos/ (hoja) o viene escrita en la lección (grilla), como en las aulas de la v1.
      hoja: nombreHoja.optional(),
      grilla: z.array(z.array(z.union([z.string(), z.number(), z.null()]))).min(1, "la grilla necesita al menos una fila").optional(),
      // Hojas de consulta (por ejemplo comunas), que se leen con referencias como comunas!A2:E13.
      otras: z.array(nombreHoja).default([]),
      // Celdas escritas de antemano: títulos de columna, un valor de referencia o una fórmula a corregir.
      inicial: z.record(rangoCeldas, contenidoCelda).default({}),
      celdas: z.array(celdaEsperada).min(1, "indica al menos una celda a revisar"),
      solucion: z.record(rangoCeldas, contenidoCelda),
      pistas,
    })
    .refine((tarea) => (tarea.hoja === undefined) !== (tarea.grilla === undefined), {
      message: "indica la hoja (un CSV de datos/) o la grilla, una de las dos",
      path: ["hoja"],
    }),
  MarkdownTask: z.object({
    id: idTarea,
    enunciado: z.string().optional(),
    inicial: z.string().default(""),
    requisitos: z.array(requisitoMarkdown).min(1, "indica al menos un requisito"),
    solucion: texto,
    pistas,
  }),
  // Se revisa contra el GitHub de la persona: {usuario} se reemplaza por su usuario. Sin repositorio, pega el enlace.
  GithubTask: z.object({
    id: idTarea,
    enunciado: z.string().optional(),
    repositorio: z
      .string()
      .regex(/^\{usuario\}\/(?:\{usuario\}|[A-Za-z0-9._-]+)$/, 'debe ser "{usuario}/nombre-del-repositorio" o "{usuario}/{usuario}"')
      .optional(),
    requisitos: z.array(requisitoGithub).min(1, "indica al menos un requisito"),
    pistas,
  }),
  Decision: z.object({
    pregunta: texto,
    opciones: z
      .array(z.object({ texto, correcta: z.boolean().default(false), porque: texto }))
      .min(2, "necesita al menos dos opciones")
      .refine((opciones) => opciones.some((opcion) => opcion.correcta), "al menos una opción debe ser correcta"),
  }),
  // Un quiz de opción única, como los de las aulas de la v1: se aprueba con todas las respuestas correctas.
  QuizTask: z.object({
    id: idTarea,
    enunciado: z.string().optional(),
    preguntas: z
      .array(
        z
          .object({ pregunta: texto, opciones: z.array(texto).min(2, "necesita al menos dos opciones"), correcta: z.number().int().min(0), explicacion: texto })
          .refine((pregunta) => pregunta.correcta < pregunta.opciones.length, { message: "correcta debe ser el índice de una de las opciones", path: ["correcta"] })
      )
      .min(1, "el quiz necesita al menos una pregunta"),
    pistas,
  }),
  // Una lección de lectura de las aulas de la v1: una pregunta para pensar y la respuesta del curso, que se ve al
  // marcarla como completada. No tiene validación automática.
  LecturaTask: z.object({ id: idTarea, pregunta: texto, respuesta: texto, pistas }),
  // En una lección de clases, el cierre explica la solución sin consejo de entrevista.
  Debrief: z.object({ entrevista: texto.optional() }),
  // La forma general de una instrucción, con nombres de ejemplo: se muestra pero no se ejecuta.
  Sintaxis: z.object({ codigo: texto, lenguaje: z.enum(["sql", "python", "planilla"]) }),
};

export type TipoBloque = keyof typeof bloqueSchemas;
export const TIPOS_BLOQUE = Object.keys(bloqueSchemas) as TipoBloque[];
export const TIPOS_TAREA = ["SqlTask", "PythonTask", "SheetTask", "MarkdownTask", "GithubTask", "LecturaTask", "QuizTask"] as const;

export type PropsBloque<T extends TipoBloque> = z.output<(typeof bloqueSchemas)[T]>;
export type Bloque = { [T in TipoBloque]: { tipo: T; props: PropsBloque<T>; texto: string | null } }[TipoBloque];
export type BloqueTarea = Extract<Bloque, { tipo: (typeof TIPOS_TAREA)[number] }>;

export function formatearErrorZod(error: z.ZodError): string {
  return error.issues
    .map((issue) => (issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
    .join("; ");
}
