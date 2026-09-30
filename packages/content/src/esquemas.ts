import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "debe ser un slug en minúsculas con guiones");
const texto = z.string().trim().min(1, "no puede estar vacío");
const idTarea = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "debe ser un id en minúsculas con guiones");
const pistas = z.array(texto).default([]);

export const rutaSchema = z.object({
  slug,
  titulo: texto,
  cargo: texto,
  descripcion: texto,
  estado: z.enum(["publicada", "borrador"]),
  casos: z.array(slug).min(1, "la ruta necesita al menos un caso"),
});

export const casoSchema = z.object({
  slug,
  titulo: texto,
  cargo: texto,
  empresa: texto,
  dataset: texto,
  entregable: z.string({ required_error: "el caso debe declarar su entregable" }).trim().min(1, "el caso debe declarar su entregable"),
  misiones: z.array(slug).min(1, "el caso necesita al menos una misión"),
});

export const frontmatterSchema = z.object({
  titulo: texto,
  tiempo: z.number().int().positive(),
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
export const TIPOS_TAREA = ["SqlTask", "PythonTask", "SheetTask"] as const;

export type PropsBloque<T extends TipoBloque> = z.output<(typeof bloqueSchemas)[T]>;
export type Bloque = { [T in TipoBloque]: { tipo: T; props: PropsBloque<T>; texto: string | null } }[TipoBloque];
export type BloqueTarea = Extract<Bloque, { tipo: (typeof TIPOS_TAREA)[number] }>;

export function formatearErrorZod(error: z.ZodError): string {
  return error.issues
    .map((issue) => (issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
    .join("; ");
}
