import { eq } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { users } from "@syntaxerror/db/schema";
import { hashPassword } from "@/lib/password";

export type RegisterInput = { name: string; email: string; password: string };
export type RegisterResult = { id: string; email: string };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function registerUser(db: AppDb, input: RegisterInput): Promise<RegisterResult> {
  const email = normalizeEmail(input.email);
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) throw new Error("email_taken");

  const passwordHash = await hashPassword(input.password);
  const [created] = await db
    .insert(users)
    .values({ name: input.name.trim(), email, passwordHash })
    .returning({ id: users.id, email: users.email });
  return created;
}
