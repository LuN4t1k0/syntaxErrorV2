import { and, asc, eq } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { casos, entregables, users } from "@syntaxerror/db/schema";
import { otorgarCertificados } from "@/lib/certificados/otorgar";
import { armarPagina, desplazamiento, TAMANO_PAGINA, type Pagina } from "@/lib/admin/paginacion";
import type { CertificadoEmitido } from "@/lib/certificados/servicio";
import type { MetaRequest } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import { resolverDocente } from "@/lib/preguntas-profesor";
import { recalcularCaso } from "@/lib/progreso/servicio";
import { listarAdmins, type Persona, type Rol } from "@/lib/roles";
import { absoluteUrl } from "@/lib/seo";
import { evaluarRubrica, observacionesParaLaPersona, type Observaciones, type Puntajes } from "./rubrica";

export type Revisor = { id: string; email: string; rol: Rol };
export type FilaEntregable = { id: string; estudiante: { nombre: string | null; email: string }; caso: { slug: string; titulo: string }; url: string; enviadoEn: Date };
export type ResultadoRevision =
  | { ok: true; decision: "aprobado" | "observado"; certificados: CertificadoEmitido[] }
  | { ok: false; motivo: "no_existe" | "prohibido" | "puntajes_incompletos" | "falta_observacion" };

const describir = (persona: { nombre: string | null; email: string }) => (persona.nombre ? `${persona.nombre} (${persona.email})` : persona.email);

export async function puedeRevisar(db: AppDb, revisor: Revisor, { alumnoId, casoId }: { alumnoId: string; casoId: string }): Promise<boolean> {
  if (revisor.rol === "admin") return true;
  if (revisor.rol !== "teacher") return false;
  return (await resolverDocente(db, { alumnoId, casoId })).profesorId === revisor.id;
}

export async function listarEntregablesPorRevisar(db: AppDb, revisor: Revisor): Promise<FilaEntregable[]> {
  const filas = await db
    .select({
      id: entregables.id,
      alumnoId: entregables.userId,
      casoId: entregables.casoId,
      nombre: users.name,
      email: users.email,
      casoSlug: casos.slug,
      casoTitulo: casos.titulo,
      url: entregables.url,
      enviadoEn: entregables.actualizadoEn,
    })
    .from(entregables)
    .innerJoin(users, eq(users.id, entregables.userId))
    .innerJoin(casos, eq(casos.id, entregables.casoId))
    .where(eq(entregables.estado, "pendiente"))
    .orderBy(asc(entregables.actualizadoEn));
  const visibles: FilaEntregable[] = [];
  for (const fila of filas) {
    if (!(await puedeRevisar(db, revisor, { alumnoId: fila.alumnoId, casoId: fila.casoId }))) continue;
    visibles.push({ id: fila.id, estudiante: { nombre: fila.nombre, email: fila.email }, caso: { slug: fila.casoSlug, titulo: fila.casoTitulo }, url: fila.url, enviadoEn: fila.enviadoEn });
  }
  return visibles;
}

// La lista del docente, de 25 en 25 y con búsqueda por estudiante (nombre o email): con muchos pendientes, así se
// encuentra el de una persona. El filtro de quién puede revisar qué se hace antes de cortar la página.
export async function paginaEntregablesPorRevisar(db: AppDb, revisor: Revisor, { busqueda, pagina }: { busqueda?: string; pagina: number }): Promise<Pagina<FilaEntregable>> {
  const texto = busqueda?.trim().toLowerCase() ?? "";
  const todas = (await listarEntregablesPorRevisar(db, revisor)).filter(
    (fila) => !texto || fila.estudiante.email.toLowerCase().includes(texto) || (fila.estudiante.nombre ?? "").toLowerCase().includes(texto)
  );
  return armarPagina(todas.slice(desplazamiento(pagina), desplazamiento(pagina) + TAMANO_PAGINA), todas.length, pagina);
}

export async function avisarRevision(db: AppDb, { alumnoId, casoSlug }: { alumnoId: string; casoSlug: string }, { encolar }: { encolar: Encolar }): Promise<void> {
  const [fila] = await db
    .select({ casoId: casos.id, casoTitulo: casos.titulo, nombre: users.name, email: users.email })
    .from(casos)
    .innerJoin(users, eq(users.id, alumnoId))
    .where(eq(casos.slug, casoSlug));
  if (!fila) return;
  const { profesorId } = await resolverDocente(db, { alumnoId, casoId: fila.casoId });
  const destinatarios: Persona[] = profesorId
    ? await db.select({ id: users.id, email: users.email, nombre: users.name }).from(users).where(eq(users.id, profesorId))
    : await listarAdmins(db);
  for (const persona of destinatarios) {
    await encolar({ tipo: "entregable-por-revisar", para: persona.email, nombre: persona.nombre, alumno: describir(fila), caso: fila.casoTitulo, enlace: absoluteUrl("/profesor/entregables") });
  }
}

export async function revisarEntregable(
  db: AppDb,
  { entregableId, revisor, puntajes, observaciones, comentario }: { entregableId: string; revisor: Revisor; puntajes: Puntajes; observaciones: Observaciones; comentario: string | null },
  { encolar, meta }: { encolar: Encolar; meta: MetaRequest }
): Promise<ResultadoRevision> {
  const [fila] = await db
    .select({
      alumnoId: entregables.userId,
      casoId: entregables.casoId,
      estado: entregables.estado,
      casoSlug: casos.slug,
      casoTitulo: casos.titulo,
      email: users.email,
      nombre: users.name,
    })
    .from(entregables)
    .innerJoin(casos, eq(casos.id, entregables.casoId))
    .innerJoin(users, eq(users.id, entregables.userId))
    .where(eq(entregables.id, entregableId));
  if (!fila || fila.estado !== "pendiente") return { ok: false, motivo: "no_existe" };
  if (!(await puedeRevisar(db, revisor, { alumnoId: fila.alumnoId, casoId: fila.casoId }))) return { ok: false, motivo: "prohibido" };

  // La decisión sale de la rúbrica: quien revisa pone los puntajes y la regla del equipo decide.
  const evaluacion = evaluarRubrica(puntajes, observaciones);
  if (!evaluacion.ok) return { ok: false, motivo: evaluacion.motivo };
  const { decision } = evaluacion;
  const texto = comentario?.trim() || null;

  const revisadas = await db
    .update(entregables)
    .set({ estado: decision, puntajes: evaluacion.puntajes, observaciones: evaluacion.observaciones, comentario: texto, revisadoPor: revisor.id, revisadoEn: new Date() })
    .where(and(eq(entregables.id, entregableId), eq(entregables.estado, "pendiente")))
    .returning({ id: entregables.id });
  if (revisadas.length === 0) return { ok: false, motivo: "no_existe" };

  await insertAuditLogEntry(db, {
    actorId: revisor.id,
    actorEmail: revisor.email,
    action: "deliverable_reviewed",
    targetType: "deliverable",
    targetId: entregableId,
    metadata: { decision, caso: fila.casoSlug, puntajes: evaluacion.puntajes },
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  if (decision === "aprobado") {
    const { casoCompleto } = await recalcularCaso(db, fila.alumnoId, fila.casoSlug);
    return { ok: true, decision, certificados: casoCompleto ? await otorgarCertificados(db, fila.alumnoId, fila.casoSlug, encolar) : [] };
  }
  await encolar({
    tipo: "entregable-observado",
    para: fila.email,
    nombre: fila.nombre,
    caso: fila.casoTitulo,
    observaciones: observacionesParaLaPersona(evaluacion.puntajes, evaluacion.observaciones, texto),
    enlace: absoluteUrl(`/casos/${fila.casoSlug}`),
  });
  return { ok: true, decision, certificados: [] };
}
