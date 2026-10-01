import { z } from "zod";
import { parsearRepositorio } from "@/lib/entregables/github";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const intentoSchema = z.object({ caso: slug, mision: slug, tarea: slug, aprobada: z.boolean() });
export type IntentoTarea = z.infer<typeof intentoSchema>;

export const sincronizacionSchema = z.object({ intentos: z.array(intentoSchema).max(200) });

export const entregableSchema = z.object({
  caso: slug,
  url: z
    .string()
    .trim()
    .max(500)
    .refine((url) => parsearRepositorio(url) !== null, "El enlace debe ser un repositorio de GitHub: https://github.com/tu-usuario/tu-repositorio"),
});
