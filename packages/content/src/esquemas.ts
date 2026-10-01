import { z } from "zod";
import { PATRON_REQUISITO_MARKDOWN } from "@syntaxerror/engines/markdown-requisitos";

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

// Rúbrica común para revisar entregables (propuesta pedagógica, sección 9). Un caso puede reemplazarla.
export const RUBRICA_BASE = [
  "Responde la pregunta del encargo del caso.",
  "El README explica qué se hizo, con qué datos y cómo revisarlo.",
  "Las conclusiones se apoyan en los datos y en el análisis.",
];

export const casoSchema = z.object({
  slug,
  titulo: texto,
  cargo: texto,
  empresa: texto,
  dataset: texto,
  entregable: z.string({ required_error: "el caso debe declarar su entregable" }).trim().min(1, "el caso debe declarar su entregable"),
  archivos: z.array(z.string().regex(/^\.[a-z0-9]+$/, "cada archivo requerido es una extensión, por ejemplo .sql")).default([]),
  rubrica: z.array(texto).min(1, "la rúbrica necesita al menos un criterio").default(RUBRICA_BASE),
  misiones: z.array(slug).min(1, "el caso necesita al menos una misión"),
});

export const frontmatterSchema = z.object({
  titulo: texto,
  tiempo: z.number().int().positive(),
  // La misión final de cada caso: sin concepto, ejemplos ni pistas (propuesta pedagógica, sección 5).
  sinGuia: z.boolean().default(false),
});

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
  SheetTask: z.object({
    id: idTarea,
    enunciado: z.string().optional(),
    hoja: z.string().regex(/^[a-z_][a-z0-9_]*$/, "debe ser el nombre de un CSV de datos/"),
    celdas: z.array(celdaEsperada).min(1, "indica al menos una celda a revisar"),
    solucion: z.record(z.string(), z.union([z.string(), z.number()])),
    pistas,
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
  Debrief: z.object({ entrevista: texto }),
};

export type TipoBloque = keyof typeof bloqueSchemas;
export const TIPOS_BLOQUE = Object.keys(bloqueSchemas) as TipoBloque[];
export const TIPOS_TAREA = ["SqlTask", "PythonTask", "SheetTask", "MarkdownTask", "GithubTask"] as const;

export type PropsBloque<T extends TipoBloque> = z.output<(typeof bloqueSchemas)[T]>;
export type Bloque = { [T in TipoBloque]: { tipo: T; props: PropsBloque<T>; texto: string | null } }[TipoBloque];
export type BloqueTarea = Extract<Bloque, { tipo: (typeof TIPOS_TAREA)[number] }>;

export function formatearErrorZod(error: z.ZodError): string {
  return error.issues
    .map((issue) => (issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
    .join("; ");
}
