import { z } from "zod";
import type { AppDb } from "@syntaxerror/db/client";
import { reportes } from "@syntaxerror/db/schema";
import type { Encolar } from "@/lib/emails";
import { listarAdmins, type Persona } from "@/lib/roles";

// Solo rutas internas: empieza con "/" pero no con "//", y no lleva espacios.
const pagina = z.string().trim().max(300).regex(/^\/(?!\/)\S*$/);

export const reporteSchema = z.object({
  tipo: z.enum(["error", "sugerencia"]),
  descripcion: z.string().trim().min(10).max(2000),
  pagina,
});
export type DatosReporte = z.infer<typeof reporteSchema>;

export function paginaValida(valor: string): boolean {
  return pagina.safeParse(valor).success;
}

export function contextoDePagina(valor: string): { caso: string | null; mision: string | null } {
  const coincidencia = /^\/casos\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?/.exec(valor);
  return { caso: coincidencia?.[1] ?? null, mision: coincidencia?.[2] ?? null };
}

export async function crearReporte(db: AppDb, autor: Persona, datos: DatosReporte, { encolar }: { encolar: Encolar }): Promise<string> {
  const [creado] = await db
    .insert(reportes)
    .values({ userId: autor.id, ...datos, ...contextoDePagina(datos.pagina) })
    .returning({ id: reportes.id });
  const quien = autor.nombre ? `${autor.nombre} (${autor.email})` : autor.email;
  for (const admin of await listarAdmins(db)) {
    await encolar({
      tipo: "reporte-nuevo",
      para: admin.email,
      nombre: admin.nombre,
      tipoReporte: datos.tipo,
      descripcion: datos.descripcion,
      pagina: datos.pagina,
      autor: quien,
    });
  }
  return creado.id;
}
