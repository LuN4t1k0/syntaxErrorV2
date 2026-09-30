import { and, eq } from "drizzle-orm";
import type { DbClient } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { users } from "@syntaxerror/db/schema";
import type { Encolar } from "@/lib/emails";
import { enlaceVerificarEmail } from "./enlaces";
import type { MetaRequest } from "./meta";
import { consumirTokenEmail, crearTokenEmail } from "./tokens";

export async function enviarVerificacion(
  db: DbClient,
  usuario: { id: string; email: string; name: string | null },
  encolar: Encolar
): Promise<void> {
  const token = await crearTokenEmail(db, { userId: usuario.id, tipo: "verificar", email: usuario.email });
  await encolar({ tipo: "verificar-email", para: usuario.email, nombre: usuario.name, enlace: enlaceVerificarEmail(token) });
}

export async function reenviarVerificacion(
  db: DbClient,
  userId: string,
  encolar: Encolar
): Promise<"enviado" | "ya_verificado" | "sin_usuario"> {
  const [usuario] = await db.select().from(users).where(eq(users.id, userId));
  if (!usuario) return "sin_usuario";
  if (usuario.emailVerified) return "ya_verificado";
  await enviarVerificacion(db, usuario, encolar);
  return "enviado";
}

export async function confirmarVerificacion(
  db: DbClient,
  token: string,
  meta: MetaRequest
): Promise<{ ok: true } | { ok: false; motivo: "invalido" | "vencido" }> {
  const resultado = await consumirTokenEmail(db, "verificar", token);
  if (!resultado.ok) return resultado;

  // Solo vale si la cuenta sigue teniendo el email al que se mandó el enlace.
  const actualizados = await db
    .update(users)
    .set({ emailVerified: new Date(), updatedAt: new Date() })
    .where(and(eq(users.id, resultado.userId), eq(users.email, resultado.email)))
    .returning({ id: users.id });
  if (actualizados.length === 0) return { ok: false, motivo: "invalido" };

  await insertAuditLogEntry(db, {
    actorId: resultado.userId,
    actorEmail: resultado.email,
    action: "email_verified",
    targetType: "user",
    targetId: resultado.userId,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });
  return { ok: true };
}

// Las cuentas de Google llegan con el email ya confirmado por Google.
export async function necesitaVerificar(db: DbClient, userId: string): Promise<boolean> {
  const [usuario] = await db
    .select({ passwordHash: users.passwordHash, emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.id, userId));
  return Boolean(usuario?.passwordHash) && !usuario?.emailVerified;
}
