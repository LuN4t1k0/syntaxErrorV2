import type { AppDb } from "@syntaxerror/db/client";
import { users } from "@syntaxerror/db/schema";
import { normalizeEmail } from "@/app/api/auth/register/service";
import { hashPassword } from "@/lib/password";

export async function seedAdmin(db: AppDb, input: { email: string; password: string }): Promise<{ id: string }> {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const [row] = await db
    .insert(users)
    .values({ email, name: "Admin", role: "admin", passwordHash })
    .onConflictDoUpdate({ target: users.email, set: { role: "admin", passwordHash, updatedAt: new Date() } })
    .returning({ id: users.id });
  return row;
}
