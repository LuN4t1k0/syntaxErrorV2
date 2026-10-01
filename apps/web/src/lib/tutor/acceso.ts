import { and, eq } from "drizzle-orm";
import type { DbClient } from "@syntaxerror/db/client";
import { casos, misionProgreso } from "@syntaxerror/db/schema";
import { tutorHabilitado, umbralTutor } from "@/lib/progreso/ayudas";

export type EstadoTutor = { habilitado: boolean; fallidos: number; umbral: number };

export async function estadoTutor(db: DbClient, userId: string, casoSlug: string, mision: { slug: string; sinGuia: boolean }): Promise<EstadoTutor> {
  const [fila] = await db
    .select({ estado: misionProgreso.estado, fallidos: misionProgreso.fallidos })
    .from(misionProgreso)
    .innerJoin(casos, eq(casos.id, misionProgreso.casoId))
    .where(and(eq(misionProgreso.userId, userId), eq(casos.slug, casoSlug), eq(misionProgreso.mision, mision.slug)));
  const fallidos = fila?.fallidos ?? 0;
  return {
    habilitado: tutorHabilitado({ fallidos, aprobada: fila?.estado === "aprobada", sinGuia: mision.sinGuia }),
    fallidos,
    umbral: umbralTutor(mision.sinGuia),
  };
}
