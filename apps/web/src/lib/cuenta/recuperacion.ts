import { and, eq } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { users } from "@syntaxerror/db/schema";
import { normalizeEmail } from "@/app/api/auth/register/service";
import type { Encolar } from "@/lib/emails";
import { hashPassword } from "@/lib/password";
import { enlaceRestablecerClave } from "./enlaces";
import type { MetaRequest } from "./meta";
import { consumirTokenEmail, crearTokenEmail } from "./tokens";

export async function solicitarRecuperacion(db: AppDb, email: string, encolar: Encolar): Promise<void> {
  const [usuario] = await db.select().from(users).where(eq(users.email, normalizeEmail(email)));
  if (!usuario) return;

  const token = await crearTokenEmail(db, { userId: usuario.id, tipo: "recuperar", email: usuario.email });
  await encolar({ tipo: "recuperar-clave", para: usuario.email, nombre: usuario.name, enlace: enlaceRestablecerClave(token) });
}

export async function restablecerClave(
  db: AppDb,
  token: string,
  claveNueva: string,
  { encolar, meta }: { encolar: Encolar; meta: MetaRequest }
): Promise<{ ok: true; email: string } | { ok: false; motivo: "invalido" | "vencido" }> {
  const resultado = await consumirTokenEmail(db, "recuperar", token);
  if (!resultado.ok) return resultado;

  const passwordHash = await hashPassword(claveNueva);
  const [usuario] = await db.transaction(async (tx) => {
    const actualizados = await tx
      .update(users)
      .set({ passwordHash, emailVerified: new Date(), updatedAt: new Date() })
      .where(and(eq(users.id, resultado.userId), eq(users.email, resultado.email)))
      .returning({ id: users.id, email: users.email, name: users.name });
    if (actualizados.length > 0) {
      await insertAuditLogEntry(tx, {
        actorId: resultado.userId,
        actorEmail: resultado.email,
        action: "password_reset",
        targetType: "user",
        targetId: resultado.userId,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });
    }
    return actualizados;
  });
  if (!usuario) return { ok: false, motivo: "invalido" };

  await encolar({ tipo: "clave-cambiada", para: usuario.email, nombre: usuario.name });
  return { ok: true, email: usuario.email };
}
