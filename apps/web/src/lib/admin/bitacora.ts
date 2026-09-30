import { and, count, desc, eq, ilike, type SQL } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import type { AuditAction } from "@syntaxerror/db/audit";
import { auditLog } from "@syntaxerror/db/schema";
import { armarPagina, desplazamiento, TAMANO_PAGINA, type Pagina } from "./paginacion";
import { patronLiteral } from "./usuarios";

export type FilaBitacora = { id: string; creadoEn: Date; accion: string; actorEmail: string | null; destino: string | null; destinoId: string | null; metadata: Record<string, unknown>; ip: string | null };

export async function listarBitacora(db: AppDb, { accion, email, pagina }: { accion?: AuditAction; email?: string; pagina: number }): Promise<Pagina<FilaBitacora>> {
  const condiciones: SQL[] = [];
  if (accion) condiciones.push(eq(auditLog.action, accion));
  const texto = email?.trim();
  if (texto) condiciones.push(ilike(auditLog.actorEmail, patronLiteral(texto)));
  const filtro = condiciones.length > 0 ? and(...condiciones) : undefined;
  const [filas, [conteo]] = await Promise.all([
    db.select({ id: auditLog.id, creadoEn: auditLog.createdAt, accion: auditLog.action, actorEmail: auditLog.actorEmail, destino: auditLog.targetType, destinoId: auditLog.targetId, metadata: auditLog.metadata, ip: auditLog.ipAddress }).from(auditLog).where(filtro).orderBy(desc(auditLog.createdAt), desc(auditLog.id)).limit(TAMANO_PAGINA).offset(desplazamiento(pagina)),
    db.select({ total: count() }).from(auditLog).where(filtro),
  ]);
  return armarPagina(filas, Number(conteo?.total ?? 0), pagina);
}
