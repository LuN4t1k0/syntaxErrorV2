import { and, desc, eq, isNotNull, ne } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { casoInscripciones, casos, entregables, users } from "@syntaxerror/db/schema";
import { listarCertificados, type CertificadoPublico } from "@/lib/certificados/servicio";
import type { MetaRequest } from "@/lib/cuenta/meta";
import { esViolacionUnica } from "@/lib/errores-db";

export const PATRON_USUARIO = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

export function sugerirUsuario(nombre: string | null, email: string): string {
  const base = (nombre?.trim() || email.split("@")[0])
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
  return base.length >= 3 ? base : `${base || "alumno"}-cl`;
}

export type ResultadoPortafolio =
  | { ok: true; usuario: string | null }
  | { ok: false; motivo: "usuario_invalido" | "usuario_en_uso" | "usuario_requerido" };

export async function actualizarPortafolio(
  db: AppDb,
  userId: string,
  { publico, usuario }: { publico: boolean; usuario?: string },
  meta: MetaRequest
): Promise<ResultadoPortafolio> {
  const [actual] = await db.select().from(users).where(eq(users.id, userId));
  if (!actual) throw new Error("cuenta_no_encontrada");

  const elegido = usuario === undefined ? actual.usuario : usuario.trim().toLowerCase() || null;
  if (elegido && !PATRON_USUARIO.test(elegido)) return { ok: false, motivo: "usuario_invalido" };
  if (publico && !elegido) return { ok: false, motivo: "usuario_requerido" };

  if (elegido && elegido !== actual.usuario) {
    const [ocupado] = await db.select({ id: users.id }).from(users).where(and(eq(users.usuario, elegido), ne(users.id, userId)));
    if (ocupado) return { ok: false, motivo: "usuario_en_uso" };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.update(users).set({ usuario: elegido, portafolioPublico: publico, updatedAt: new Date() }).where(eq(users.id, userId));
      await insertAuditLogEntry(tx, {
        actorId: userId,
        actorEmail: actual.email,
        action: "portfolio_updated",
        targetType: "user",
        targetId: userId,
        metadata: { publico, usuario: elegido },
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });
    });
  } catch (error) {
    if (esViolacionUnica(error)) return { ok: false, motivo: "usuario_en_uso" };
    throw error;
  }

  return { ok: true, usuario: elegido };
}

export type CasoDelPortafolio = {
  slug: string;
  titulo: string;
  empresa: string;
  cargo: string;
  completadoEn: Date;
  entregable: string | null;
};

export type Portafolio = {
  nombre: string;
  usuario: string;
  casos: CasoDelPortafolio[];
  certificados: CertificadoPublico[];
};

export async function obtenerPortafolio(db: AppDb, usuario: string): Promise<Portafolio | null> {
  const [dueno] = await db
    .select()
    .from(users)
    .where(and(eq(users.usuario, usuario.toLowerCase()), eq(users.portafolioPublico, true)));
  if (!dueno?.usuario) return null;

  const casosCompletos = await db
    .select({
      slug: casos.slug,
      titulo: casos.titulo,
      empresa: casos.empresa,
      cargo: casos.cargo,
      completadoEn: casoInscripciones.completadoEn,
      entregable: entregables.url,
    })
    .from(casoInscripciones)
    .innerJoin(casos, eq(casos.id, casoInscripciones.casoId))
    .leftJoin(entregables, and(eq(entregables.casoId, casoInscripciones.casoId), eq(entregables.userId, dueno.id)))
    // Las clases no van al portafolio: lo que se muestra son los casos, que dejan evidencia de trabajo.
    .where(and(eq(casoInscripciones.userId, dueno.id), isNotNull(casoInscripciones.completadoEn), eq(casos.tipo, "caso")))
    .orderBy(desc(casoInscripciones.completadoEn));

  return {
    nombre: dueno.name?.trim() || dueno.usuario,
    usuario: dueno.usuario,
    casos: casosCompletos.map((caso) => ({ ...caso, completadoEn: caso.completadoEn ?? new Date(0) })),
    certificados: await listarCertificados(db, dueno.id),
  };
}
