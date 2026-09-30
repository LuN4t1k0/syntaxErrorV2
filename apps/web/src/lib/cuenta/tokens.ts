import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { DbClient } from "@syntaxerror/db/client";
import { tokensEmail } from "@syntaxerror/db/schema";

export type TipoToken = "verificar" | "cambiar" | "recuperar";
export type ResultadoToken =
  | { ok: true; userId: string; email: string }
  | { ok: false; motivo: "invalido" | "vencido" };

const DIA_MS = 24 * 60 * 60 * 1000;
const DURACION_MS: Record<TipoToken, number> = { verificar: 7 * DIA_MS, cambiar: DIA_MS, recuperar: 60 * 60 * 1000 };

function hashear(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Solo se guarda el hash: quien lea la base no puede usar los enlaces pendientes.
export async function crearTokenEmail(
  db: DbClient,
  { userId, tipo, email }: { userId: string; tipo: TipoToken; email: string }
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.delete(tokensEmail).where(and(eq(tokensEmail.userId, userId), eq(tokensEmail.tipo, tipo)));
  await db.insert(tokensEmail).values({
    userId,
    tipo,
    email,
    tokenHash: hashear(token),
    expiraEn: new Date(Date.now() + DURACION_MS[tipo]),
  });
  return token;
}

// DELETE ... RETURNING: el token se usa una sola vez aunque lleguen dos confirmaciones a la vez.
export async function consumirTokenEmail(db: DbClient, tipo: TipoToken, token: string): Promise<ResultadoToken> {
  const [fila] = await db
    .delete(tokensEmail)
    .where(and(eq(tokensEmail.tipo, tipo), eq(tokensEmail.tokenHash, hashear(token))))
    .returning();
  if (!fila) return { ok: false, motivo: "invalido" };
  if (fila.expiraEn.getTime() < Date.now()) return { ok: false, motivo: "vencido" };
  return { ok: true, userId: fila.userId, email: fila.email };
}
