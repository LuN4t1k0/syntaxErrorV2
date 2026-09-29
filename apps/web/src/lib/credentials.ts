import { eq } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { users } from "@syntaxerror/db/schema";
import { normalizeEmail } from "@/app/api/auth/register/service";
import { verifyPassword } from "./password";
import { peekRateLimit, recordRateLimitFailure, resetRateLimit } from "./rate-limit";

export type AuthorizedUser = { id: string; name: string | null; email: string; role: string };

export type AuthorizeResult =
  | { status: "ok"; user: AuthorizedUser }
  | { status: "invalid" }
  | { status: "rate_limited" };

export async function authorizeCredentials(
  db: AppDb,
  input: { email: string; password: string; ip: string }
): Promise<AuthorizeResult> {
  const email = normalizeEmail(input.email);
  const [emailLimit, ipLimit] = await Promise.all([
    peekRateLimit("login-email", email),
    peekRateLimit("login-ip", input.ip),
  ]);
  if (!emailLimit.allowed || !ipLimit.allowed) return { status: "rate_limited" };

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    await Promise.all([
      recordRateLimitFailure("login-email", email),
      recordRateLimitFailure("login-ip", input.ip),
    ]);
    return { status: "invalid" };
  }

  await resetRateLimit("login-email", email);
  return { status: "ok", user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}
