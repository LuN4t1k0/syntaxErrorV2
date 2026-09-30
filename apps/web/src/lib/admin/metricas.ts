import { and, asc, avg, count, eq, ne, sql } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { casoInscripciones, casos, misionProgreso, rutaCasos, rutas } from "@syntaxerror/db/schema";

export const DIAS_ABANDONO = 14;

export type FilaContenido = { slug: string; titulo: string; rutas: { slug: string; titulo: string; estado: string }[]; inscritos: number; completados: number };
export type MetricaMision = { slug: string; titulo: string; iniciaron: number; aprobaron: number; tasaAprobacion: number; intentosPromedio: number; abandonos: number; trabas: { tarea: string; estudiantes: number }[] };
export type MetricasCaso = { caso: { slug: string; titulo: string }; misiones: MetricaMision[] };

export async function resumenContenido(db: AppDb): Promise<FilaContenido[]> {
  const [listaCasos, enlaces, conteos] = await Promise.all([
    db.select({ id: casos.id, slug: casos.slug, titulo: casos.titulo }).from(casos).orderBy(asc(casos.titulo)),
    db.select({ casoId: rutaCasos.casoId, slug: rutas.slug, titulo: rutas.titulo, estado: rutas.estado }).from(rutaCasos).innerJoin(rutas, eq(rutas.id, rutaCasos.rutaId)).orderBy(asc(rutas.titulo)),
    db.select({ casoId: casoInscripciones.casoId, inscritos: count(), completados: count(casoInscripciones.completadoEn) }).from(casoInscripciones).groupBy(casoInscripciones.casoId),
  ]);
  return listaCasos.map((caso) => {
    const conteo = conteos.find((fila) => fila.casoId === caso.id);
    return {
      slug: caso.slug,
      titulo: caso.titulo,
      rutas: enlaces.filter((enlace) => enlace.casoId === caso.id).map(({ slug, titulo, estado }) => ({ slug, titulo, estado })),
      inscritos: Number(conteo?.inscritos ?? 0),
      completados: Number(conteo?.completados ?? 0),
    };
  });
}

export async function metricasDeCaso(db: AppDb, casoSlug: string, ahora = new Date()): Promise<MetricasCaso | null> {
  const [caso] = await db.select({ id: casos.id, slug: casos.slug, titulo: casos.titulo, misiones: casos.misiones }).from(casos).where(eq(casos.slug, casoSlug));
  if (!caso) return null;
  const limite = new Date(ahora.getTime() - DIAS_ABANDONO * 86_400_000).toISOString();
  const [agregados, enCurso] = await Promise.all([
    db.select({
      mision: misionProgreso.mision,
      iniciaron: count(),
      aprobaron: sql<string>`count(*) filter (where ${misionProgreso.estado} = 'aprobada')`,
      intentos: avg(misionProgreso.intentos),
      abandonos: sql<string>`count(*) filter (where ${misionProgreso.estado} <> 'aprobada' and ${misionProgreso.actualizadoEn} < ${limite}::timestamptz)`,
    }).from(misionProgreso).where(eq(misionProgreso.casoId, caso.id)).groupBy(misionProgreso.mision),
    db.select({ mision: misionProgreso.mision, tareasAprobadas: misionProgreso.tareasAprobadas }).from(misionProgreso).where(and(eq(misionProgreso.casoId, caso.id), ne(misionProgreso.estado, "aprobada"))),
  ]);
  return {
    caso: { slug: caso.slug, titulo: caso.titulo },
    misiones: caso.misiones.map((mision) => {
      const fila = agregados.find((agregado) => agregado.mision === mision.slug);
      const iniciaron = Number(fila?.iniciaron ?? 0);
      const aprobaron = Number(fila?.aprobaron ?? 0);
      const porTarea = new Map<string, number>();
      for (const progreso of enCurso) {
        if (progreso.mision !== mision.slug) continue;
        const tarea = mision.tareas.find((candidata) => !progreso.tareasAprobadas.includes(candidata));
        if (tarea) porTarea.set(tarea, (porTarea.get(tarea) ?? 0) + 1);
      }
      return {
        slug: mision.slug,
        titulo: mision.titulo,
        iniciaron,
        aprobaron,
        tasaAprobacion: iniciaron > 0 ? Math.round((aprobaron / iniciaron) * 100) / 100 : 0,
        intentosPromedio: fila?.intentos ? Math.round(Number(fila.intentos) * 10) / 10 : 0,
        abandonos: Number(fila?.abandonos ?? 0),
        trabas: [...porTarea].map(([tarea, estudiantes]) => ({ tarea, estudiantes })).sort((a, b) => b.estudiantes - a.estudiantes || mision.tareas.indexOf(a.tarea) - mision.tareas.indexOf(b.tarea)),
      };
    }),
  };
}
