import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const intentoSchema = z.object({ caso: slug, mision: slug, tarea: slug, aprobada: z.boolean() });
export type IntentoTarea = z.infer<typeof intentoSchema>;

export const sincronizacionSchema = z.object({ intentos: z.array(intentoSchema).max(200) });

export const entregableSchema = z.object({
  caso: slug,
  url: z.string().trim().max(500).url().refine((url) => url.startsWith("https://"), "El enlace debe empezar con https://"),
});
