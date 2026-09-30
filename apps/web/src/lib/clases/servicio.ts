import { and, asc, count, desc, eq, inArray, isNotNull } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { casoInscripciones, casos, claseCasos, claseInscripciones, clases, misionProgreso, rutaCasos, rutas, users } from "@syntaxerror/db/schema";
import { enlaceMisClases, enlacePanelDocente } from "@/lib/cuenta/enlaces";
import type { Encolar } from "@/lib/emails";
import { generarCodigo, normalizarCodigo } from "./codigo";

export type Clase = typeof clases.$inferSelect;
export type EstadoInscripcion = "pendiente" | "activa" | "retirada";
export type ResumenClase = { id: string; titulo: string; codigo: string; estado: string; ruta: string; pendientes: number; activas: number };
export type CasoDeClase = { slug: string; titulo: string; habilitado: boolean };
export type AvanceCaso = { slug: string; titulo: string; aprobadas: number; total: number; completo: boolean };
export type EstudianteDeClase = { userId: string; nombre: string | null; email: string; estado: EstadoInscripcion; casos: AvanceCaso[] };
export type ClaseDelEstudiante = { id: string; titulo: string; docente: string; estado: EstadoInscripcion; casos: { slug: string; titulo: string }[] };
export type ResultadoUnirse = { ok: true; estado: EstadoInscripcion; clase: string } | { ok: false; motivo: "codigo_invalido" | "es_tu_clase" };

const describir = (persona: { nombre: string | null; email: string }) => (persona.nombre ? `${persona.nombre} (${persona.email})` : persona.email);

export async function crearClase(db: AppDb, { profesorId, titulo, rutaSlug }: { profesorId: string; titulo: string; rutaSlug: string }): Promise<Clase | null> {
  const [ruta] = await db.select({ id: rutas.id }).from(rutas).where(eq(rutas.slug, rutaSlug));
  if (!ruta) return null;
  return db.transaction(async (tx) => {
    let creada: Clase | undefined;
    for (let intento = 0; intento < 5 && !creada; intento++) {
      [creada] = await tx
        .insert(clases)
        .values({ profesorId, rutaId: ruta.id, titulo, codigo: generarCodigo() })
        .onConflictDoNothing({ target: clases.codigo })
        .returning();
    }
    if (!creada) throw new Error("No se pudo generar un código de clase único");
    const claseId = creada.id;
    const casosDeRuta = await tx.select({ casoId: rutaCasos.casoId }).from(rutaCasos).where(eq(rutaCasos.rutaId, ruta.id));
    if (casosDeRuta.length > 0) await tx.insert(claseCasos).values(casosDeRuta.map(({ casoId }) => ({ claseId, casoId })));
    return creada;
  });
}

export async function clasesDelProfesor(db: AppDb, profesorId: string): Promise<ResumenClase[]> {
  const filas = await db
    .select({ id: clases.id, titulo: clases.titulo, codigo: clases.codigo, estado: clases.estado, ruta: rutas.titulo })
    .from(clases)
    .innerJoin(rutas, eq(rutas.id, clases.rutaId))
    .where(eq(clases.profesorId, profesorId))
    .orderBy(desc(clases.creadaEn));
  if (filas.length === 0) return [];
  const conteos = await db
    .select({ claseId: claseInscripciones.claseId, estado: claseInscripciones.estado, total: count() })
    .from(claseInscripciones)
    .where(inArray(claseInscripciones.claseId, filas.map((fila) => fila.id)))
    .groupBy(claseInscripciones.claseId, claseInscripciones.estado);
  const contar = (claseId: string, estado: EstadoInscripcion) =>
    Number(conteos.find((conteo) => conteo.claseId === claseId && conteo.estado === estado)?.total ?? 0);
  return filas.map((fila) => ({ ...fila, pendientes: contar(fila.id, "pendiente"), activas: contar(fila.id, "activa") }));
}

export async function claseDelProfesor(db: AppDb, { profesorId, claseId }: { profesorId: string; claseId: string }): Promise<Clase | null> {
  const [clase] = await db.select().from(clases).where(and(eq(clases.id, claseId), eq(clases.profesorId, profesorId)));
  return clase ?? null;
}

export async function casosDeClase(db: AppDb, claseId: string): Promise<CasoDeClase[]> {
  return db
    .select({ slug: casos.slug, titulo: casos.titulo, habilitado: claseCasos.habilitado })
    .from(claseCasos)
    .innerJoin(casos, eq(casos.id, claseCasos.casoId))
    .innerJoin(clases, eq(clases.id, claseCasos.claseId))
    .leftJoin(rutaCasos, and(eq(rutaCasos.rutaId, clases.rutaId), eq(rutaCasos.casoId, claseCasos.casoId)))
    .where(eq(claseCasos.claseId, claseId))
    .orderBy(asc(rutaCasos.orden), asc(casos.titulo));
}

export async function cambiarCasoHabilitado(
  db: AppDb,
  { profesorId, claseId, casoSlug, habilitado }: { profesorId: string; claseId: string; casoSlug: string; habilitado: boolean }
): Promise<boolean> {
  if (!(await claseDelProfesor(db, { profesorId, claseId }))) return false;
  const [caso] = await db.select({ id: casos.id }).from(casos).where(eq(casos.slug, casoSlug));
  if (!caso) return false;
  const filas = await db
    .update(claseCasos)
    .set({ habilitado })
    .where(and(eq(claseCasos.claseId, claseId), eq(claseCasos.casoId, caso.id)))
    .returning({ casoId: claseCasos.casoId });
  return filas.length > 0;
}

export async function unirseAClase(db: AppDb, { userId, codigo }: { userId: string; codigo: string }, { encolar }: { encolar: Encolar }): Promise<ResultadoUnirse> {
  const [clase] = await db
    .select({ id: clases.id, titulo: clases.titulo, profesorId: clases.profesorId, email: users.email, nombre: users.name })
    .from(clases)
    .innerJoin(users, eq(users.id, clases.profesorId))
    .where(and(eq(clases.codigo, normalizarCodigo(codigo)), eq(clases.estado, "activa")));
  if (!clase) return { ok: false, motivo: "codigo_invalido" };
  if (clase.profesorId === userId) return { ok: false, motivo: "es_tu_clase" };

  const creadas = await db.insert(claseInscripciones).values({ claseId: clase.id, userId }).onConflictDoNothing().returning({ estado: claseInscripciones.estado });
  if (creadas.length > 0) {
    const [estudiante] = await db.select({ email: users.email, nombre: users.name }).from(users).where(eq(users.id, userId));
    await encolar({
      tipo: "clase-solicitud",
      para: clase.email,
      nombre: clase.nombre,
      alumno: estudiante ? describir(estudiante) : "Una persona",
      clase: clase.titulo,
      enlace: enlacePanelDocente(clase.id),
    });
    return { ok: true, estado: "pendiente", clase: clase.titulo };
  }
  const [actual] = await db
    .select({ estado: claseInscripciones.estado })
    .from(claseInscripciones)
    .where(and(eq(claseInscripciones.claseId, clase.id), eq(claseInscripciones.userId, userId)));
  return { ok: true, estado: actual.estado as EstadoInscripcion, clase: clase.titulo };
}

export async function decidirInscripcion(
  db: AppDb,
  { profesorId, claseId, userId, estado }: { profesorId: string; claseId: string; userId: string; estado: "activa" | "retirada" },
  { encolar }: { encolar: Encolar }
): Promise<boolean> {
  const clase = await claseDelProfesor(db, { profesorId, claseId });
  if (!clase) return false;
  const clave = and(eq(claseInscripciones.claseId, claseId), eq(claseInscripciones.userId, userId));
  const [inscripcion] = await db.select({ estado: claseInscripciones.estado }).from(claseInscripciones).where(clave);
  if (!inscripcion) return false;
  if (inscripcion.estado === estado) return true;

  // Solo cambia si nadie la cambió entremedio: así el email sale una vez.
  const cambiadas = await db
    .update(claseInscripciones)
    .set({ estado, decididaEn: new Date() })
    .where(and(clave, eq(claseInscripciones.estado, inscripcion.estado)))
    .returning({ userId: claseInscripciones.userId });
  if (cambiadas.length > 0) {
    const [estudiante] = await db.select({ email: users.email, nombre: users.name }).from(users).where(eq(users.id, userId));
    if (estudiante) {
      await encolar({ tipo: "clase-decision", para: estudiante.email, nombre: estudiante.nombre, clase: clase.titulo, aceptada: estado === "activa", enlace: enlaceMisClases() });
    }
  }
  return true;
}

export async function rosterDeClase(db: AppDb, { profesorId, claseId }: { profesorId: string; claseId: string }): Promise<EstudianteDeClase[] | null> {
  if (!(await claseDelProfesor(db, { profesorId, claseId }))) return null;
  const [inscritas, habilitados] = await Promise.all([
    db
      .select({ userId: claseInscripciones.userId, nombre: users.name, email: users.email, estado: claseInscripciones.estado })
      .from(claseInscripciones)
      .innerJoin(users, eq(users.id, claseInscripciones.userId))
      .where(eq(claseInscripciones.claseId, claseId))
      .orderBy(asc(claseInscripciones.solicitadaEn)),
    db
      .select({ id: casos.id, slug: casos.slug, titulo: casos.titulo, misiones: casos.misiones })
      .from(claseCasos)
      .innerJoin(casos, eq(casos.id, claseCasos.casoId))
      .where(and(eq(claseCasos.claseId, claseId), eq(claseCasos.habilitado, true))),
  ]);
  const personas = inscritas.map((fila) => fila.userId);
  const casoIds = habilitados.map((caso) => caso.id);
  const hayDatos = personas.length > 0 && casoIds.length > 0;
  const aprobadas = hayDatos
    ? await db
        .select({ userId: misionProgreso.userId, casoId: misionProgreso.casoId, mision: misionProgreso.mision })
        .from(misionProgreso)
        .where(and(inArray(misionProgreso.userId, personas), inArray(misionProgreso.casoId, casoIds), eq(misionProgreso.estado, "aprobada")))
    : [];
  const completos = hayDatos
    ? await db
        .select({ userId: casoInscripciones.userId, casoId: casoInscripciones.casoId })
        .from(casoInscripciones)
        .where(and(inArray(casoInscripciones.userId, personas), inArray(casoInscripciones.casoId, casoIds), isNotNull(casoInscripciones.completadoEn)))
    : [];

  return inscritas.map((fila) => ({
    ...fila,
    estado: fila.estado as EstadoInscripcion,
    casos: habilitados.map((caso) => ({
      slug: caso.slug,
      titulo: caso.titulo,
      total: caso.misiones.length,
      aprobadas: aprobadas.filter((a) => a.userId === fila.userId && a.casoId === caso.id && caso.misiones.some((m) => m.slug === a.mision)).length,
      completo: completos.some((c) => c.userId === fila.userId && c.casoId === caso.id),
    })),
  }));
}

export async function clasesDelEstudiante(db: AppDb, userId: string): Promise<ClaseDelEstudiante[]> {
  const filas = await db
    .select({ id: clases.id, titulo: clases.titulo, docente: users.name, estado: claseInscripciones.estado })
    .from(claseInscripciones)
    .innerJoin(clases, eq(clases.id, claseInscripciones.claseId))
    .innerJoin(users, eq(users.id, clases.profesorId))
    .where(eq(claseInscripciones.userId, userId))
    .orderBy(desc(claseInscripciones.solicitadaEn));
  const activas = filas.filter((fila) => fila.estado === "activa").map((fila) => fila.id);
  const casosActivos =
    activas.length > 0
      ? await db
          .select({ claseId: claseCasos.claseId, slug: casos.slug, titulo: casos.titulo })
          .from(claseCasos)
          .innerJoin(casos, eq(casos.id, claseCasos.casoId))
          .where(and(inArray(claseCasos.claseId, activas), eq(claseCasos.habilitado, true)))
      : [];
  return filas.map((fila) => ({
    id: fila.id,
    titulo: fila.titulo,
    docente: fila.docente ?? "Tu docente",
    estado: fila.estado as EstadoInscripcion,
    casos: casosActivos.filter((caso) => caso.claseId === fila.id).map(({ slug, titulo }) => ({ slug, titulo })),
  }));
}
