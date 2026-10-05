import { eq } from "drizzle-orm";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import type { AppDb, DbClient } from "@syntaxerror/db/client";
import { ajustes } from "@syntaxerror/db/schema";
import type { MetaRequest } from "@/lib/cuenta/meta";

// Ajustes generales que cambia un admin. Cada uno guarda su valor como JSON.
export const AJUSTE_ORDEN_LIBRE = "orden_libre";

// Encendido, ningún estudiante tiene bloqueos de orden en las rutas (los probadores ya no los tienen).
export async function ordenLibreParaTodos(db: DbClient): Promise<boolean> {
  const [fila] = await db.select({ valor: ajustes.valor }).from(ajustes).where(eq(ajustes.clave, AJUSTE_ORDEN_LIBRE));
  return fila?.valor === true;
}

export async function cambiarOrdenLibreParaTodos(db: AppDb, { admin, activo }: { admin: { id: string; email: string }; activo: boolean }, meta: MetaRequest): Promise<void> {
  await db.transaction(async (tx) => {
    const anterior = await ordenLibreParaTodos(tx);
    if (anterior === activo) return;
    const ahora = new Date();
    await tx
      .insert(ajustes)
      .values({ clave: AJUSTE_ORDEN_LIBRE, valor: activo, actualizadoEn: ahora, actualizadoPor: admin.id })
      .onConflictDoUpdate({ target: ajustes.clave, set: { valor: activo, actualizadoEn: ahora, actualizadoPor: admin.id } });
    await insertAuditLogEntry(tx, {
      actorId: admin.id,
      actorEmail: admin.email,
      action: "setting_changed",
      // target_id es un uuid: la clave del ajuste va en metadata.
      targetType: "setting",
      metadata: { clave: AJUSTE_ORDEN_LIBRE, anterior, nuevo: activo },
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}
