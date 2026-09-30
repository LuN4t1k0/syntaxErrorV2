import { createHash, randomBytes } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import type { AppDb, DbClient } from "@syntaxerror/db/client";
import { insertAuditLogEntry, type AuditAction } from "@syntaxerror/db/audit";
import {
  casoInscripciones,
  casos,
  certificados,
  claseInscripciones,
  clases,
  entregables,
  mensajes,
  misionProgreso,
  preguntasProfesor,
  reportes,
  resenasCaso,
  rutaInscripciones,
  rutas,
  solicitudesDocente,
  tokensEmail,
  transaccionesPuntos,
  users,
} from "@syntaxerror/db/schema";
import { normalizeEmail } from "@/app/api/auth/register/service";
import type { Encolar } from "@/lib/emails";
import { esViolacionUnica } from "@/lib/errores-db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { enlaceConfirmarEmail } from "./enlaces";
import type { MetaRequest } from "./meta";
import { consumirTokenEmail } from "./tokens";

type Usuario = typeof users.$inferSelect;
type Dependencias = { encolar: Encolar; meta: MetaRequest };

export type Perfil = {
  nombre: string | null;
  email: string;
  tieneClave: boolean;
  emailVerificado: boolean;
  usuario: string | null;
  portafolioPublico: boolean;
};

export type DatosExportados = {
  exportadoEn: string;
  cuenta: {
    nombre: string | null;
    email: string;
    rol: string;
    creadaEn: Date;
    emailVerificado: Date | null;
    usuario: string | null;
    portafolioPublico: boolean;
  };
  misiones: {
    caso: string;
    mision: string;
    estado: string;
    intentos: number;
    tareasAprobadas: string[];
    aprobadaEn: Date | null;
  }[];
  casos: { caso: string; inscritoEn: Date; completadoEn: Date | null }[];
  rutas: { ruta: string; inscritoEn: Date; completadoEn: Date | null }[];
  entregables: { caso: string; url: string; actualizadoEn: Date }[];
  certificados: { codigo: string; tipo: string; titulo: string; emitidoEn: Date }[];
  puntos: { caso: string; motivo: string; cantidad: number; creadoEn: Date }[];
  preguntasDocentes: { caso: string; mision: string; texto: string; respuesta: string | null; estado: string; creadaEn: Date }[];
  resenas: { caso: string; estrellas: number; comentario: string | null; creadaEn: Date }[];
  reportes: { tipo: string; descripcion: string; pagina: string; estado: string; creadoEn: Date }[];
  mensajes: { asunto: string; cuerpo: string; leidoEn: Date | null; creadoEn: Date }[];
  clases: { clase: string; estado: string; solicitadaEn: Date }[];
  solicitudesDocente: { estado: string; creadaEn: Date }[];
};

async function buscarUsuario(db: DbClient, userId: string): Promise<Usuario | null> {
  const [usuario] = await db.select().from(users).where(eq(users.id, userId));
  return usuario ?? null;
}

function emailNormalizadoGuardado(usuario: { email: string }): string {
  return normalizeEmail(usuario.email);
}

function hashearToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function auditar(
  db: DbClient,
  usuario: { id: string; email: string },
  action: AuditAction,
  meta: MetaRequest,
  metadata?: Record<string, unknown>
) {
  return insertAuditLogEntry(db, {
    actorId: usuario.id,
    actorEmail: usuario.email,
    action,
    targetType: "user",
    targetId: usuario.id,
    metadata,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });
}

export async function obtenerPerfil(db: AppDb, userId: string): Promise<Perfil | null> {
  const usuario = await buscarUsuario(db, userId);
  if (!usuario) return null;
  return {
    nombre: usuario.name,
    email: usuario.email,
    tieneClave: Boolean(usuario.passwordHash),
    emailVerificado: Boolean(usuario.emailVerified),
    usuario: usuario.usuario,
    portafolioPublico: usuario.portafolioPublico,
  };
}

export async function actualizarNombre(db: AppDb, userId: string, nombre: string, meta: MetaRequest): Promise<void> {
  const usuario = await buscarUsuario(db, userId);
  if (!usuario) return;
  await db.transaction(async (tx) => {
    await tx.update(users).set({ name: nombre, updatedAt: new Date() }).where(eq(users.id, userId));
    await auditar(tx, usuario, "profile_updated", meta, { nombreAnterior: usuario.name, nombreNuevo: nombre });
  });
}

export async function cambiarClave(
  db: AppDb,
  userId: string,
  { claveActual, claveNueva }: { claveActual: string; claveNueva: string },
  { encolar, meta }: Dependencias
): Promise<{ ok: true } | { ok: false; motivo: "sin_clave" | "clave_incorrecta" }> {
  const usuario = await buscarUsuario(db, userId);
  if (!usuario?.passwordHash) return { ok: false, motivo: "sin_clave" };
  if (!(await verifyPassword(claveActual, usuario.passwordHash))) return { ok: false, motivo: "clave_incorrecta" };

  const passwordHash = await hashPassword(claveNueva);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
    await auditar(tx, usuario, "password_changed", meta);
  });
  await encolar({ tipo: "clave-cambiada", para: usuario.email, nombre: usuario.name });
  return { ok: true };
}

export async function solicitarCambioEmail(
  db: AppDb,
  userId: string,
  { nuevoEmail, claveActual }: { nuevoEmail: string; claveActual?: string },
  { encolar, meta }: Dependencias
): Promise<{ ok: true } | { ok: false; motivo: "clave_incorrecta" | "mismo_email" | "email_en_uso" }> {
  const usuario = await buscarUsuario(db, userId);
  if (!usuario) throw new Error("cuenta_no_encontrada");
  const email = normalizeEmail(nuevoEmail);
  if (email === emailNormalizadoGuardado(usuario)) return { ok: false, motivo: "mismo_email" };

  if (usuario.passwordHash && !(claveActual && (await verifyPassword(claveActual, usuario.passwordHash)))) {
    return { ok: false, motivo: "clave_incorrecta" };
  }

  const [ocupado] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(sql`lower(${users.email}) = ${email}`, ne(users.id, userId)));
  if (ocupado) return { ok: false, motivo: "email_en_uso" };

  const token = randomBytes(32).toString("base64url");
  await encolar({ tipo: "confirmar-nuevo-email", para: email, nombre: usuario.name, enlace: enlaceConfirmarEmail(token) });
  await db.transaction(async (tx) => {
    await tx.delete(tokensEmail).where(and(eq(tokensEmail.userId, userId), eq(tokensEmail.tipo, "cambiar")));
    await tx.insert(tokensEmail).values({
      userId,
      tipo: "cambiar",
      email,
      tokenHash: hashearToken(token),
      expiraEn: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await auditar(tx, usuario, "email_change_requested", meta, { nuevoEmail: email });
  });
  await encolar({ tipo: "aviso-cambio-email", para: usuario.email, nombre: usuario.name, nuevoEmail: email }).catch((error) =>
    console.error("[cuenta] no se pudo avisar el cambio de email al correo actual", error)
  );
  return { ok: true };
}

export async function confirmarCambioEmail(
  db: AppDb,
  token: string,
  meta: MetaRequest
): Promise<{ ok: true; email: string } | { ok: false; motivo: "invalido" | "vencido" | "email_en_uso" }> {
  const resultado = await consumirTokenEmail(db, "cambiar", token);
  if (!resultado.ok) return resultado;
  const usuario = await buscarUsuario(db, resultado.userId);
  if (!usuario) return { ok: false, motivo: "invalido" };

  const [ocupado] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(sql`lower(${users.email}) = ${resultado.email}`, ne(users.id, usuario.id)));
  if (ocupado) return { ok: false, motivo: "email_en_uso" };

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ email: resultado.email, emailVerified: new Date(), updatedAt: new Date() })
        .where(eq(users.id, usuario.id));
      await auditar(tx, { id: usuario.id, email: resultado.email }, "email_changed", meta, {
        emailAnterior: usuario.email,
        emailNuevo: resultado.email,
      });
    });
  } catch (error) {
    if (esViolacionUnica(error)) return { ok: false, motivo: "email_en_uso" };
    throw error;
  }
  return { ok: true, email: resultado.email };
}

export async function exportarDatos(db: AppDb, userId: string, meta: MetaRequest): Promise<DatosExportados | null> {
  const usuario = await buscarUsuario(db, userId);
  if (!usuario) return null;

  const [misiones, casosInscritos, rutasInscritas, susEntregables, susCertificados] = await Promise.all([
    db
      .select({
        caso: casos.slug,
        mision: misionProgreso.mision,
        estado: misionProgreso.estado,
        intentos: misionProgreso.intentos,
        tareasAprobadas: misionProgreso.tareasAprobadas,
        aprobadaEn: misionProgreso.aprobadaEn,
      })
      .from(misionProgreso)
      .innerJoin(casos, eq(casos.id, misionProgreso.casoId))
      .where(eq(misionProgreso.userId, userId)),
    db
      .select({ caso: casos.slug, inscritoEn: casoInscripciones.inscritoEn, completadoEn: casoInscripciones.completadoEn })
      .from(casoInscripciones)
      .innerJoin(casos, eq(casos.id, casoInscripciones.casoId))
      .where(eq(casoInscripciones.userId, userId)),
    db
      .select({ ruta: rutas.slug, inscritoEn: rutaInscripciones.inscritoEn, completadoEn: rutaInscripciones.completadoEn })
      .from(rutaInscripciones)
      .innerJoin(rutas, eq(rutas.id, rutaInscripciones.rutaId))
      .where(eq(rutaInscripciones.userId, userId)),
    db
      .select({ caso: casos.slug, url: entregables.url, actualizadoEn: entregables.actualizadoEn })
      .from(entregables)
      .innerJoin(casos, eq(casos.id, entregables.casoId))
      .where(eq(entregables.userId, userId)),
    db
      .select({
        codigo: certificados.codigo,
        tipo: certificados.tipo,
        titulo: certificados.titulo,
        emitidoEn: certificados.emitidoEn,
      })
      .from(certificados)
      .where(eq(certificados.userId, userId)),
  ]);

  const [puntos, preguntasDocentes, resenas, susReportes, susMensajes, susClases, solicitudes] = await Promise.all([
    db
      .select({ caso: casos.slug, motivo: transaccionesPuntos.motivo, cantidad: transaccionesPuntos.cantidad, creadoEn: transaccionesPuntos.creadoEn })
      .from(transaccionesPuntos)
      .innerJoin(casos, eq(casos.id, transaccionesPuntos.casoId))
      .where(eq(transaccionesPuntos.userId, userId)),
    db
      .select({
        caso: casos.slug,
        mision: preguntasProfesor.mision,
        texto: preguntasProfesor.texto,
        respuesta: preguntasProfesor.respuesta,
        estado: preguntasProfesor.estado,
        creadaEn: preguntasProfesor.creadaEn,
      })
      .from(preguntasProfesor)
      .innerJoin(casos, eq(casos.id, preguntasProfesor.casoId))
      .where(eq(preguntasProfesor.alumnoId, userId)),
    db
      .select({ caso: casos.slug, estrellas: resenasCaso.estrellas, comentario: resenasCaso.comentario, creadaEn: resenasCaso.creadaEn })
      .from(resenasCaso)
      .innerJoin(casos, eq(casos.id, resenasCaso.casoId))
      .where(eq(resenasCaso.userId, userId)),
    db
      .select({ tipo: reportes.tipo, descripcion: reportes.descripcion, pagina: reportes.pagina, estado: reportes.estado, creadoEn: reportes.creadoEn })
      .from(reportes)
      .where(eq(reportes.userId, userId)),
    db
      .select({ asunto: mensajes.asunto, cuerpo: mensajes.cuerpo, leidoEn: mensajes.leidoEn, creadoEn: mensajes.creadoEn })
      .from(mensajes)
      .where(eq(mensajes.userId, userId)),
    db
      .select({ clase: clases.titulo, estado: claseInscripciones.estado, solicitadaEn: claseInscripciones.solicitadaEn })
      .from(claseInscripciones)
      .innerJoin(clases, eq(clases.id, claseInscripciones.claseId))
      .where(eq(claseInscripciones.userId, userId)),
    db
      .select({ estado: solicitudesDocente.estado, creadaEn: solicitudesDocente.creadaEn })
      .from(solicitudesDocente)
      .where(eq(solicitudesDocente.userId, userId)),
  ]);

  await auditar(db, usuario, "data_exported", meta);
  return {
    exportadoEn: new Date().toISOString(),
    cuenta: {
      nombre: usuario.name,
      email: usuario.email,
      rol: usuario.role,
      creadaEn: usuario.createdAt,
      emailVerificado: usuario.emailVerified,
      usuario: usuario.usuario,
      portafolioPublico: usuario.portafolioPublico,
    },
    misiones,
    casos: casosInscritos,
    rutas: rutasInscritas,
    entregables: susEntregables,
    certificados: susCertificados,
    puntos,
    preguntasDocentes,
    resenas,
    reportes: susReportes,
    mensajes: susMensajes,
    clases: susClases,
    solicitudesDocente: solicitudes,
  };
}

export async function eliminarCuenta(
  db: AppDb,
  userId: string,
  confirmacion: string,
  { encolar, meta }: Dependencias
): Promise<{ ok: true } | { ok: false; motivo: "clave_incorrecta" | "confirmacion_incorrecta" }> {
  const usuario = await buscarUsuario(db, userId);
  if (!usuario) return { ok: true };

  if (usuario.passwordHash) {
    if (!(await verifyPassword(confirmacion, usuario.passwordHash))) return { ok: false, motivo: "clave_incorrecta" };
  } else if (normalizeEmail(confirmacion) !== emailNormalizadoGuardado(usuario)) {
    return { ok: false, motivo: "confirmacion_incorrecta" };
  }

  await db.transaction(async (tx) => {
    await auditar(tx, usuario, "account_deleted", meta);
    await tx.delete(users).where(eq(users.id, userId));
  });
  await encolar({ tipo: "cuenta-eliminada", para: usuario.email, nombre: usuario.name });
  return { ok: true };
}
