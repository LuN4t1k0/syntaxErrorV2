import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { getDb } from "@syntaxerror/db/client";
import { accounts, users } from "@syntaxerror/db/schema";
import type { AuditAction } from "@syntaxerror/db/audit";
import { normalizeEmail } from "@/app/api/auth/register/service";
import { recordAuditEvent } from "./audit";
import { verifyPassword } from "./password";
import { checkRateLimit } from "./rate-limit";

async function recordAuthEvent(input: { actorId: string | null; actorEmail: string | null; action: AuditAction }) {
  try {
    await recordAuditEvent(getDb(), input);
  } catch (error) {
    console.error("[audit] no se pudo registrar el evento de auth", error);
  }
}

const providers = [
  ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })]
    : []),
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials, request) {
      const email = credentials?.email as string | undefined;
      const password = credentials?.password as string | undefined;
      if (!email || !password) return null;

      const normalizedEmail = normalizeEmail(email);
      const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
      const [emailLimit, ipLimit] = await Promise.all([
        checkRateLimit("login-email", normalizedEmail),
        checkRateLimit("login-ip", ip),
      ]);
      if (!emailLimit.allowed || !ipLimit.allowed) return null;

      const [user] = await getDb().select().from(users).where(eq(users.email, normalizedEmail));
      if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
        await recordAuthEvent({ actorId: null, actorEmail: normalizedEmail, action: "login_failed" });
        return null;
      }

      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
  }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(getDb(), { usersTable: users, accountsTable: accounts }),
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/login" },
  events: {
    async signIn({ user }) {
      await recordAuthEvent({ actorId: user.id ?? null, actorEmail: user.email ?? null, action: "login_success" });
    },
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      await recordAuthEvent({
        actorId: (token?.sub as string | undefined) ?? null,
        actorEmail: (token?.email as string | undefined) ?? null,
        action: "logout",
      });
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as typeof user & { role?: string }).role;
      }
      if (token.sub && !token.role) {
        const [stored] = await getDb().select({ role: users.role }).from(users).where(eq(users.id, token.sub));
        token.role = stored?.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = typeof token.role === "string" ? token.role : "student";
      }
      return session;
    },
  },
});
