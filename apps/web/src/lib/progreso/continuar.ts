import { and, desc, eq } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { casoInscripciones, casos, misionProgreso } from "@syntaxerror/db/schema";

type CasoCorto = { slug: string; titulo: string };

export type SiguientePaso =
  | { tipo: "mision"; caso: CasoCorto; mision: { slug: string; titulo: string }; href: string }
  | { tipo: "entregable"; caso: CasoCorto; href: string };

export async function siguientePaso(db: AppDb, userId: string, publicados: ReadonlySet<string>): Promise<SiguientePaso | null> {
  const filas = await db
    .select({
      casoSlug: casos.slug,
      casoTitulo: casos.titulo,
      misiones: casos.misiones,
      mision: misionProgreso.mision,
      estado: misionProgreso.estado,
      completadoEn: casoInscripciones.completadoEn,
    })
    .from(misionProgreso)
    .innerJoin(casos, eq(casos.id, misionProgreso.casoId))
    .leftJoin(casoInscripciones, and(eq(casoInscripciones.userId, misionProgreso.userId), eq(casoInscripciones.casoId, misionProgreso.casoId)))
    .where(eq(misionProgreso.userId, userId))
    .orderBy(desc(misionProgreso.actualizadoEn));

  const revisados = new Set<string>();
  for (const ultima of filas) {
    if (revisados.has(ultima.casoSlug)) continue;
    revisados.add(ultima.casoSlug);
    if (!publicados.has(ultima.casoSlug) || ultima.completadoEn) continue;

    const caso = { slug: ultima.casoSlug, titulo: ultima.casoTitulo };
    const aprobadas = new Set(filas.filter((fila) => fila.casoSlug === ultima.casoSlug && fila.estado === "aprobada").map((fila) => fila.mision));
    const indice = ultima.misiones.findIndex((mision) => mision.slug === ultima.mision);
    const enCurso = indice >= 0 && ultima.estado !== "aprobada" ? ultima.misiones[indice] : undefined;
    const orden = indice >= 0 ? [...ultima.misiones.slice(indice + 1), ...ultima.misiones.slice(0, indice + 1)] : ultima.misiones;
    const destino = enCurso ?? orden.find((mision) => !aprobadas.has(mision.slug));

    if (destino) {
      return { tipo: "mision", caso, mision: { slug: destino.slug, titulo: destino.titulo }, href: `/casos/${caso.slug}/${destino.slug}` };
    }
    return { tipo: "entregable", caso, href: `/casos/${caso.slug}` };
  }

  return null;
}
