import { eq } from "drizzle-orm";
import type { JWT } from "next-auth/jwt";
import type { DbClient } from "@syntaxerror/db/client";
import { users } from "@syntaxerror/db/schema";

export async function refrescarToken(db: DbClient, token: JWT): Promise<JWT | null> {
  if (!token.sub) return token;
  const [fila] = await db.select({ role: users.role }).from(users).where(eq(users.id, token.sub));
  if (!fila) return null;
  return { ...token, role: fila.role };
}
