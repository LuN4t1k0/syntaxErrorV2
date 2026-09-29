import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { registerUser } from "./service";

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const limit = await checkRateLimit("register-ip", ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  try {
    const result = await registerUser(getDb(), parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "email_taken") {
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }
    throw err;
  }
}
