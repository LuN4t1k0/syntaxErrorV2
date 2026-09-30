import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "@syntaxerror/db/client";
import { accounts, users } from "@syntaxerror/db/schema";
import type { AuditAction } from "@syntaxerror/db/audit";
import { normalizeEmail } from "@/app/api/auth/register/service";
import { recordAuditEvent } from "./audit";
import { getClientIp } from "./client-ip";
import { authorizeCredentials } from "./credentials";
import { refrescarToken } from "./sesion-token";

class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

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

      const result = await authorizeCredentials(getDb(), { email, password, ip: getClientIp(request.headers) });
      if (result.status === "rate_limited") throw new RateLimitedSignin();
      if (result.status === "invalid") {
        await recordAuthEvent({ actorId: null, actorEmail: normalizeEmail(email), action: "login_failed" });
        return null;
      }
      return result.user;
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
      if (user?.id) token.sub = user.id;
      return refrescarToken(getDb(), token);
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
