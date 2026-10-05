import { count, desc, eq, ilike, or } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { users } from "@syntaxerror/db/schema";
import { normalizeEmail } from "@/app/api/auth/register/service";
import { listarCertificados } from "@/lib/certificados/servicio";
import type { MetaRequest } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import type { Nivel } from "@/lib/puntos/niveles";
import { obtenerNivel } from "@/lib/puntos/servicio";
import { listarCasosDelUsuario, type CasoDelUsuario } from "@/lib/progreso/servicio";
import { esRol, type Rol } from "@/lib/roles";
import { armarPagina, desplazamiento, TAMANO_PAGINA, type Pagina } from "./paginacion";

export type FilaUsuario = { id: string; nombre: string | null; email: string; rol: Rol; verificado: boolean; probador: boolean; creadoEn: Date };
export type DetalleUsuario = FilaUsuario & { usuarioPublico: string | null; casos: CasoDelUsuario[]; nivel: Nivel; certificados: number };
export type Admin = { id: string; email: string };

const columnas = { id: users.id, nombre: users.name, email: users.email, rol: users.role, emailVerificado: users.emailVerified, probador: users.probador, creadoEn: users.createdAt };

function aFila(fila: { id: string; nombre: string | null; email: string; rol: string; emailVerificado: Date | null; probador: boolean; creadoEn: Date }): FilaUsuario {
  return { id: fila.id, nombre: fila.nombre, email: fila.email, rol: esRol(fila.rol) ? fila.rol : "student", verificado: fila.emailVerificado !== null, probador: fila.probador, creadoEn: fila.creadoEn };
}

export function patronLiteral(texto: string): string {
  return `%${texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`)}%`;
}

export async function listarUsuarios(db: AppDb, { busqueda, pagina }: { busqueda?: string; pagina: number }): Promise<Pagina<FilaUsuario>> {
  const texto = busqueda?.trim();
  const filtro = texto ? or(ilike(users.email, patronLiteral(texto)), ilike(users.name, patronLiteral(texto))) : undefined;
  const [filas, [conteo]] = await Promise.all([
    db.select(columnas).from(users).where(filtro).orderBy(desc(users.createdAt), desc(users.id)).limit(TAMANO_PAGINA).offset(desplazamiento(pagina)),
    db.select({ total: count() }).from(users).where(filtro),
  ]);
  return armarPagina(filas.map(aFila), Number(conteo?.total ?? 0), pagina);
}

export async function detalleUsuario(db: AppDb, id: string): Promise<DetalleUsuario | null> {
  const [fila] = await db.select({ ...columnas, usuarioPublico: users.usuario }).from(users).where(eq(users.id, id));
  if (!fila) return null;
  const [casos, nivel, certificados] = await Promise.all([listarCasosDelUsuario(db, id), obtenerNivel(db, id), listarCertificados(db, id)]);
  return { ...aFila(fila), usuarioPublico: fila.usuarioPublico, casos, nivel, certificados: certificados.length };
}

export async function cambiarRol(db: AppDb, { admin, userId, rol }: { admin: Admin; userId: string; rol: Rol }, meta: MetaRequest): Promise<"ok" | "no_existe" | "propio"> {
  if (userId === admin.id) return "propio";
  return db.transaction(async (tx) => {
    const [actual] = await tx.select({ rol: users.role, email: users.email }).from(users).where(eq(users.id, userId)).for("update");
    if (!actual) return "no_existe";
    if (actual.rol === rol) return "ok";
    await tx.update(users).set({ role: rol, updatedAt: new Date() }).where(eq(users.id, userId));
    await insertAuditLogEntry(tx, {
      actorId: admin.id,
      actorEmail: admin.email,
      action: "role_changed",
      targetType: "user",
      targetId: userId,
      metadata: { rolAnterior: actual.rol, rolNuevo: rol, email: actual.email },
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return "ok";
  });
}

// Un probador hace las rutas en el orden que quiera y entra a las rutas en beta, para probarlas antes que el resto.
export async function cambiarProbador(db: AppDb, { admin, userId, probador }: { admin: Admin; userId: string; probador: boolean }, meta: MetaRequest): Promise<"ok" | "no_existe"> {
  return db.transaction(async (tx) => {
    const [actual] = await tx.select({ probador: users.probador, email: users.email }).from(users).where(eq(users.id, userId)).for("update");
    if (!actual) return "no_existe";
    if (actual.probador === probador) return "ok";
    await tx.update(users).set({ probador, updatedAt: new Date() }).where(eq(users.id, userId));
    await insertAuditLogEntry(tx, {
      actorId: admin.id,
      actorEmail: admin.email,
      action: "tester_changed",
      targetType: "user",
      targetId: userId,
      metadata: { probador, email: actual.email },
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return "ok";
  });
}

export async function eliminarUsuario(
  db: AppDb,
  { admin, userId, confirmacion }: { admin: Admin; userId: string; confirmacion: string },
  { encolar, meta }: { encolar: Encolar; meta: MetaRequest }
): Promise<"ok" | "no_existe" | "propio" | "confirmacion_incorrecta"> {
  if (userId === admin.id) return "propio";
  const [cuenta] = await db.select({ email: users.email, nombre: users.name }).from(users).where(eq(users.id, userId));
  if (!cuenta) return "no_existe";
  if (normalizeEmail(confirmacion) !== normalizeEmail(cuenta.email)) return "confirmacion_incorrecta";
  const eliminada = await db.transaction(async (tx) => {
    const filas = await tx.delete(users).where(eq(users.id, userId)).returning({ id: users.id });
    if (filas.length === 0) return false;
    await insertAuditLogEntry(tx, {
      actorId: admin.id,
      actorEmail: admin.email,
      action: "account_deleted",
      targetType: "user",
      targetId: userId,
      metadata: { porAdmin: true, email: cuenta.email },
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
    return true;
  });
  if (!eliminada) return "no_existe";
  await encolar({ tipo: "cuenta-eliminada", para: cuenta.email, nombre: cuenta.nombre });
  return "ok";
}
