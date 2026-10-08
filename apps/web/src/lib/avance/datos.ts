import { desc, eq, inArray } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { casoInscripciones, casos, entregables, misionProgreso, preguntasProfesor, rutaCasos, rutaInscripciones, rutas, transaccionesPuntos, tutorPreguntas, users } from "@syntaxerror/db/schema";
import type { Nivel } from "@/lib/puntos/niveles";
import { obtenerNivel, type MotivoPuntos } from "@/lib/puntos/servicio";
import { esRol, type Rol } from "@/lib/roles";
import { unidad } from "@/lib/unidad";

export const LIMITE_ACTIVIDAD = 20;

export type EstadoLeccion = "aprobada" | "en_curso" | "sin_empezar";
export type EstadoCasoAvance = "completo" | "en_curso" | "pendiente";
export type LeccionAvance = { slug: string; titulo: string; estado: EstadoLeccion; intentos: number; fallidos: number; actualizadoEn: Date | null; href: string };
export type CasoAvance = { slug: string; titulo: string; tipo: "caso" | "clases"; estado: EstadoCasoAvance; aprobadas: number; total: number; lecciones: LeccionAvance[]; href: string };
export type RutaAvance = { slug: string; titulo: string; completos: number; casos: CasoAvance[] };
export type CasoCorto = { slug: string; titulo: string };
export type EntregaAvance = {
  caso: CasoCorto;
  estado: "pendiente" | "aprobado" | "observado";
  url: string;
  puntajes: Partial<Record<string, number>>;
  observaciones: Partial<Record<string, string>>;
  comentario: string | null;
  enviadaEn: Date;
  revisadaEn: Date | null;
};
export type PreguntaPendiente = { id: string; caso: CasoCorto; mision: string; creadaEn: Date };
export type TipoEvento = "leccion" | "entrega" | "tutor" | "docente" | "puntos";
export type EventoAvance = { fecha: Date; tipo: TipoEvento; texto: string; href: string | null };
export type PerfilAvance = { id: string; nombre: string | null; email: string; rol: Rol; probador: boolean; verificado: boolean; registradoEn: Date; nivel: Nivel };
export type AvanceAlumno = {
  perfil: PerfilAvance;
  ultimaActividad: Date | null;
  rutas: RutaAvance[];
  // Casos empezados que no están en ninguna de sus rutas.
  otrosCasos: CasoAvance[];
  entregas: EntregaAvance[];
  preguntasPendientes: PreguntaPendiente[];
  actividad: EventoAvance[];
};

const ESTADOS_ENTREGA = new Set(["pendiente", "aprobado", "observado"]);
// point_transactions guarda el motivo como código (MotivoPuntos); la actividad lo muestra en palabras.
const MOTIVOS: Record<MotivoPuntos, string> = { mision_aprobada: "misión aprobada", caso_completo: "caso completo", decision: "decisión", reporte_util: "reporte útil" };

// Todo el avance de una persona, para su ficha en administración, su página de avance y el email. Solo lee.
export async function avanceDelAlumno(db: AppDb, userId: string): Promise<AvanceAlumno | null> {
  const [persona] = await db
    .select({ id: users.id, nombre: users.name, email: users.email, rol: users.role, probador: users.probador, verificadoEn: users.emailVerified, registradoEn: users.createdAt, rutaElegida: users.rutaElegida })
    .from(users)
    .where(eq(users.id, userId));
  if (!persona) return null;

  const [progreso, inscripcionesCaso, inscripcionesRuta, filasEntregas, preguntas, tutor, puntos, nivel] = await Promise.all([
    db
      .select({ casoId: misionProgreso.casoId, mision: misionProgreso.mision, estado: misionProgreso.estado, intentos: misionProgreso.intentos, fallidos: misionProgreso.fallidos, aprobadaEn: misionProgreso.aprobadaEn, actualizadoEn: misionProgreso.actualizadoEn })
      .from(misionProgreso)
      .where(eq(misionProgreso.userId, userId)),
    db.select({ casoId: casoInscripciones.casoId, completadoEn: casoInscripciones.completadoEn }).from(casoInscripciones).where(eq(casoInscripciones.userId, userId)),
    db.select({ rutaId: rutaInscripciones.rutaId }).from(rutaInscripciones).where(eq(rutaInscripciones.userId, userId)),
    db
      .select({ casoId: entregables.casoId, estado: entregables.estado, url: entregables.url, puntajes: entregables.puntajes, observaciones: entregables.observaciones, comentario: entregables.comentario, creadoEn: entregables.creadoEn, revisadoEn: entregables.revisadoEn })
      .from(entregables)
      .where(eq(entregables.userId, userId))
      .orderBy(desc(entregables.creadoEn)),
    db.select({ id: preguntasProfesor.id, casoId: preguntasProfesor.casoId, mision: preguntasProfesor.mision, estado: preguntasProfesor.estado, creadaEn: preguntasProfesor.creadaEn }).from(preguntasProfesor).where(eq(preguntasProfesor.alumnoId, userId)),
    db.select({ casoId: tutorPreguntas.casoId, mision: tutorPreguntas.mision, creadoEn: tutorPreguntas.creadoEn }).from(tutorPreguntas).where(eq(tutorPreguntas.userId, userId)).orderBy(desc(tutorPreguntas.creadoEn)).limit(LIMITE_ACTIVIDAD),
    db.select({ casoId: transaccionesPuntos.casoId, motivo: transaccionesPuntos.motivo, cantidad: transaccionesPuntos.cantidad, creadoEn: transaccionesPuntos.creadoEn }).from(transaccionesPuntos).where(eq(transaccionesPuntos.userId, userId)).orderBy(desc(transaccionesPuntos.creadoEn)).limit(LIMITE_ACTIVIDAD),
    obtenerNivel(db, userId),
  ]);

  const rutaIds = [...new Set([...inscripcionesRuta.map((fila) => fila.rutaId), ...(persona.rutaElegida ? [persona.rutaElegida] : [])])];
  const [filasRutas, enlaces] = rutaIds.length
    ? await Promise.all([
        db.select({ id: rutas.id, slug: rutas.slug, titulo: rutas.titulo }).from(rutas).where(inArray(rutas.id, rutaIds)),
        db.select({ rutaId: rutaCasos.rutaId, casoId: rutaCasos.casoId }).from(rutaCasos).where(inArray(rutaCasos.rutaId, rutaIds)).orderBy(rutaCasos.orden),
      ])
    : [[], []];

  const casoIds = new Set([
    ...enlaces.map((fila) => fila.casoId),
    ...progreso.map((fila) => fila.casoId),
    ...inscripcionesCaso.map((fila) => fila.casoId),
    ...filasEntregas.map((fila) => fila.casoId),
    ...preguntas.map((fila) => fila.casoId),
    ...tutor.map((fila) => fila.casoId),
    ...puntos.map((fila) => fila.casoId),
  ]);
  const filasCasos = casoIds.size ? await db.select({ id: casos.id, slug: casos.slug, titulo: casos.titulo, tipo: casos.tipo, misiones: casos.misiones }).from(casos).where(inArray(casos.id, [...casoIds])) : [];
  const casoPorId = new Map(filasCasos.map((fila) => [fila.id, fila]));
  const completados = new Set(inscripcionesCaso.filter((fila) => fila.completadoEn !== null).map((fila) => fila.casoId));
  const corto = (casoId: string): CasoCorto => ({ slug: casoPorId.get(casoId)?.slug ?? "", titulo: casoPorId.get(casoId)?.titulo ?? "" });
  const tituloMision = (casoId: string, mision: string) => casoPorId.get(casoId)?.misiones.find((fila) => fila.slug === mision)?.titulo ?? mision;

  function armarCaso(casoId: string): CasoAvance | null {
    const caso = casoPorId.get(casoId);
    if (!caso) return null;
    const propias = new Map(progreso.filter((fila) => fila.casoId === casoId).map((fila) => [fila.mision, fila]));
    // Solo cuentan las lecciones que siguen en el caso: una guardada que se renombró o borró se omite.
    const lecciones: LeccionAvance[] = caso.misiones.map((mision) => {
      const fila = propias.get(mision.slug);
      return {
        slug: mision.slug,
        titulo: mision.titulo,
        estado: !fila ? "sin_empezar" : fila.estado === "aprobada" ? "aprobada" : "en_curso",
        intentos: fila?.intentos ?? 0,
        fallidos: fila?.fallidos ?? 0,
        actualizadoEn: fila?.actualizadoEn ?? null,
        href: `/casos/${caso.slug}/${mision.slug}`,
      };
    });
    const empezado = lecciones.some((leccion) => leccion.estado !== "sin_empezar");
    return {
      slug: caso.slug,
      titulo: caso.titulo,
      tipo: caso.tipo === "clases" ? "clases" : "caso",
      estado: completados.has(casoId) ? "completo" : empezado ? "en_curso" : "pendiente",
      aprobadas: lecciones.filter((leccion) => leccion.estado === "aprobada").length,
      total: lecciones.length,
      lecciones,
      href: `/casos/${caso.slug}`,
    };
  }

  const listaRutas: RutaAvance[] = filasRutas
    .map((ruta) => {
      const casosDeRuta = enlaces.filter((fila) => fila.rutaId === ruta.id).flatMap((fila) => armarCaso(fila.casoId) ?? []);
      return { slug: ruta.slug, titulo: ruta.titulo, completos: casosDeRuta.filter((fila) => fila.estado === "completo").length, casos: casosDeRuta };
    })
    .sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
  const enRutas = new Set(enlaces.map((fila) => fila.casoId));
  const empezados = new Set([...progreso.map((fila) => fila.casoId), ...inscripcionesCaso.map((fila) => fila.casoId)]);
  const otrosCasos = [...empezados].filter((casoId) => !enRutas.has(casoId)).flatMap((casoId) => armarCaso(casoId) ?? []).sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));

  const actividad: EventoAvance[] = [
    ...progreso.flatMap((fila) => {
      const caso = casoPorId.get(fila.casoId);
      if (!fila.aprobadaEn || !caso || !caso.misiones.some((mision) => mision.slug === fila.mision)) return [];
      const nombre = unidad(caso.tipo === "clases" ? "clases" : "caso").Nombre;
      return [{ fecha: fila.aprobadaEn, tipo: "leccion" as const, texto: `${nombre} aprobada: ${tituloMision(fila.casoId, fila.mision)} · ${caso.titulo}`, href: `/casos/${caso.slug}/${fila.mision}` }];
    }),
    ...filasEntregas.flatMap((fila) => [
      { fecha: fila.creadoEn, tipo: "entrega" as const, texto: `Entrega enviada · ${corto(fila.casoId).titulo}`, href: `/casos/${corto(fila.casoId).slug}` },
      ...(fila.revisadoEn && fila.estado !== "pendiente" ? [{ fecha: fila.revisadoEn, tipo: "entrega" as const, texto: `Entrega ${fila.estado === "aprobado" ? "aprobada" : "observada"} · ${corto(fila.casoId).titulo}`, href: `/casos/${corto(fila.casoId).slug}` }] : []),
    ]),
    ...tutor.map((fila) => ({ fecha: fila.creadoEn, tipo: "tutor" as const, texto: `Pregunta al tutor · ${tituloMision(fila.casoId, fila.mision)} · ${corto(fila.casoId).titulo}`, href: `/casos/${corto(fila.casoId).slug}/${fila.mision}` })),
    ...preguntas.map((fila) => ({ fecha: fila.creadaEn, tipo: "docente" as const, texto: `Pregunta a un docente · ${tituloMision(fila.casoId, fila.mision)} · ${corto(fila.casoId).titulo}`, href: `/casos/${corto(fila.casoId).slug}/${fila.mision}` })),
    ...puntos.map((fila) => ({ fecha: fila.creadoEn, tipo: "puntos" as const, texto: `+${fila.cantidad} puntos · ${MOTIVOS[fila.motivo as MotivoPuntos] ?? fila.motivo}`, href: null })),
  ]
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
    .slice(0, LIMITE_ACTIVIDAD);

  const fechas = progreso.map((fila) => fila.actualizadoEn.getTime());
  return {
    perfil: {
      id: persona.id,
      nombre: persona.nombre,
      email: persona.email,
      rol: esRol(persona.rol) ? persona.rol : "student",
      probador: persona.probador,
      verificado: persona.verificadoEn !== null,
      registradoEn: persona.registradoEn,
      nivel,
    },
    ultimaActividad: fechas.length ? new Date(Math.max(...fechas)) : null,
    rutas: listaRutas,
    otrosCasos,
    entregas: filasEntregas.map((fila) => ({
      caso: corto(fila.casoId),
      estado: ESTADOS_ENTREGA.has(fila.estado) ? (fila.estado as EntregaAvance["estado"]) : "pendiente",
      url: fila.url,
      puntajes: fila.puntajes,
      observaciones: fila.observaciones,
      comentario: fila.comentario,
      enviadaEn: fila.creadoEn,
      revisadaEn: fila.revisadoEn,
    })),
    preguntasPendientes: preguntas.filter((fila) => fila.estado === "pendiente").map((fila) => ({ id: fila.id, caso: corto(fila.casoId), mision: fila.mision, creadaEn: fila.creadaEn })),
    actividad,
  };
}
