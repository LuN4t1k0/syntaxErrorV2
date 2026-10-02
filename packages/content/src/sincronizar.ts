import { eq, notInArray } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { casos, rutaCasos, rutas, type MisionResumen } from "@syntaxerror/db/schema";
import { tareasDeMision } from "./publicacion";
import type { Contenido } from "./tipos";

export async function sincronizarContenido(db: AppDb, contenido: Contenido): Promise<{ rutas: number; casos: number }> {
  return db.transaction(async (tx) => {
    const ahora = new Date();
    const idPorCaso = new Map<string, string>();

    for (const caso of contenido.casos) {
      const misiones: MisionResumen[] = caso.misiones.map((mision) => ({
        slug: mision.slug,
        titulo: mision.titulo,
        tareas: tareasDeMision(mision).map((tarea) => tarea.props.id),
      }));
      const datos = { tipo: caso.tipo, titulo: caso.titulo, cargo: caso.cargo, empresa: caso.empresa, entregable: caso.entregable, misiones, actualizadoEn: ahora };
      const [fila] = await tx.insert(casos).values({ slug: caso.slug, ...datos }).onConflictDoUpdate({ target: casos.slug, set: datos }).returning({ id: casos.id });
      idPorCaso.set(caso.slug, fila.id);
    }

    for (const ruta of contenido.rutas) {
      const datos = { titulo: ruta.titulo, cargo: ruta.cargo, descripcion: ruta.descripcion, estado: ruta.estado, actualizadoEn: ahora };
      const [fila] = await tx.insert(rutas).values({ slug: ruta.slug, ...datos }).onConflictDoUpdate({ target: rutas.slug, set: datos }).returning({ id: rutas.id });
      await tx.delete(rutaCasos).where(eq(rutaCasos.rutaId, fila.id));
      const orden = ruta.casos.map((slug, posicion) => {
        const casoId = idPorCaso.get(slug);
        if (!casoId) throw new Error(`La ruta ${ruta.slug} nombra el caso ${slug}, que no está en el contenido`);
        return { rutaId: fila.id, casoId, orden: posicion };
      });
      if (orden.length > 0) await tx.insert(rutaCasos).values(orden);
    }

    const vigentes = contenido.rutas.map((ruta) => ruta.slug);
    if (vigentes.length > 0) {
      await tx.update(rutas).set({ estado: "borrador", actualizadoEn: ahora }).where(notInArray(rutas.slug, vigentes));
    } else {
      await tx.update(rutas).set({ estado: "borrador", actualizadoEn: ahora });
    }

    return { rutas: contenido.rutas.length, casos: contenido.casos.length };
  });
}
