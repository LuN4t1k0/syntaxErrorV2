import { and, asc, count, desc, eq } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { casos, reportes, resenasCaso, solicitudesDocente, users } from "@syntaxerror/db/schema";
import type { MetaRequest } from "@/lib/cuenta/meta";
import { decidirSolicitud } from "@/lib/docentes";
import type { Encolar } from "@/lib/emails";
import { crearMensaje } from "@/lib/mensajes";
import { otorgarPuntos } from "@/lib/puntos/servicio";
import { armarPagina, desplazamiento, TAMANO_PAGINA, type Pagina } from "./paginacion";
import type { Admin } from "./usuarios";

export const PUNTOS_REPORTE_UTIL = 25;

export type SolicitudPendiente = { id: string; userId: string; nombre: string | null; email: string; creadaEn: Date };
export type ComentarioPendiente = { id: string; caso: { slug: string; titulo: string }; nombre: string | null; email: string; estrellas: number; comentario: string; creadaEn: Date };
export type FilaReporte = { id: string; tipo: string; descripcion: string; pagina: string; estado: string; autor: { nombre: string | null; email: string }; creadoEn: Date; resueltoEn: Date | null };
type Dependencias = { encolar: Encolar; meta: MetaRequest };

export async function listarSolicitudesPendientes(db: AppDb): Promise<SolicitudPendiente[]> {
  return db.select({ id: solicitudesDocente.id, userId: solicitudesDocente.userId, nombre: users.name, email: users.email, creadaEn: solicitudesDocente.creadaEn }).from(solicitudesDocente).innerJoin(users, eq(users.id, solicitudesDocente.userId)).where(eq(solicitudesDocente.estado, "pendiente")).orderBy(asc(solicitudesDocente.creadaEn));
}

export async function resolverSolicitudDocente(db: AppDb, { solicitudId, admin, decision }: { solicitudId: string; admin: Admin; decision: "aprobada" | "rechazada" }, { encolar, meta }: Dependencias): Promise<boolean> {
  const [solicitud] = await db.select({ userId: solicitudesDocente.userId }).from(solicitudesDocente).where(eq(solicitudesDocente.id, solicitudId));
  if (!solicitud) return false;
  if (!(await decidirSolicitud(db, { solicitudId, admin, decision }, meta))) return false;
  await insertAuditLogEntry(db, { actorId: admin.id, actorEmail: admin.email, action: "teacher_request_decided", targetType: "teacher_request", targetId: solicitudId, metadata: { decision }, ipAddress: meta.ip, userAgent: meta.userAgent });
  const aprobada = decision === "aprobada";
  await crearMensaje(db, { userId: solicitud.userId, remitenteId: admin.id, asunto: aprobada ? "Tu acceso docente fue aprobado" : "Revisamos tu solicitud de acceso docente", cuerpo: aprobada ? "Ya puedes crear clases y responder preguntas desde tu panel docente." : "Por ahora no aprobamos tu acceso docente. Si crees que es un error, responde el email de syntaxError.cl." }, { encolar });
  return true;
}

export async function listarComentariosPendientes(db: AppDb): Promise<ComentarioPendiente[]> {
  const filas = await db.select({ id: resenasCaso.id, casoSlug: casos.slug, casoTitulo: casos.titulo, nombre: users.name, email: users.email, estrellas: resenasCaso.estrellas, comentario: resenasCaso.comentario, creadaEn: resenasCaso.creadaEn }).from(resenasCaso).innerJoin(casos, eq(casos.id, resenasCaso.casoId)).innerJoin(users, eq(users.id, resenasCaso.userId)).where(eq(resenasCaso.estadoComentario, "pendiente")).orderBy(asc(resenasCaso.creadaEn));
  return filas.map(({ casoSlug, casoTitulo, comentario, ...fila }) => ({ ...fila, caso: { slug: casoSlug, titulo: casoTitulo }, comentario: comentario ?? "" }));
}

export async function listarReportes(db: AppDb, { estado, pagina }: { estado: "pendiente" | "resuelto"; pagina: number }): Promise<Pagina<FilaReporte>> {
  const filtro = eq(reportes.estado, estado);
  const [filas, [conteo]] = await Promise.all([
    db.select({ id: reportes.id, tipo: reportes.tipo, descripcion: reportes.descripcion, pagina: reportes.pagina, estado: reportes.estado, nombre: users.name, email: users.email, creadoEn: reportes.creadoEn, resueltoEn: reportes.resueltoEn }).from(reportes).innerJoin(users, eq(users.id, reportes.userId)).where(filtro).orderBy(estado === "pendiente" ? asc(reportes.creadoEn) : desc(reportes.resueltoEn)).limit(TAMANO_PAGINA).offset(desplazamiento(pagina)),
    db.select({ total: count() }).from(reportes).where(filtro),
  ]);
  return armarPagina(filas.map(({ nombre, email, ...fila }) => ({ ...fila, autor: { nombre, email } })), Number(conteo?.total ?? 0), pagina);
}

export async function resolverReporte(db: AppDb, { reporteId, admin, util, respuesta }: { reporteId: string; admin: Admin; util: boolean; respuesta: { asunto: string; cuerpo: string } | null }, { encolar, meta }: Dependencias): Promise<boolean> {
  const [reporte] = await db.update(reportes).set({ estado: "resuelto", resueltoPor: admin.id, resueltoEn: new Date() }).where(and(eq(reportes.id, reporteId), eq(reportes.estado, "pendiente"))).returning({ userId: reportes.userId, tipo: reportes.tipo, caso: reportes.caso });
  if (!reporte) return false;
  await insertAuditLogEntry(db, { actorId: admin.id, actorEmail: admin.email, action: "report_resolved", targetType: "report", targetId: reporteId, metadata: { util, respondido: respuesta !== null }, ipAddress: meta.ip, userAgent: meta.userAgent });
  if (util && reporte.tipo === "error" && reporte.caso) {
    const [caso] = await db.select({ id: casos.id }).from(casos).where(eq(casos.slug, reporte.caso));
    if (caso) await otorgarPuntos(db, { userId: reporte.userId, casoId: caso.id, clave: `reporte:${reporteId}`, motivo: "reporte_util", cantidad: PUNTOS_REPORTE_UTIL });
  }
  if (respuesta) await crearMensaje(db, { userId: reporte.userId, remitenteId: admin.id, reporteId, asunto: respuesta.asunto, cuerpo: respuesta.cuerpo }, { encolar });
  return true;
}
