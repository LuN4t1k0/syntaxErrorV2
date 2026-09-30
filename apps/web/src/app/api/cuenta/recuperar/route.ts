import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { normalizeEmail } from "@/app/api/auth/register/service";
import { getClientIp } from "@/lib/client-ip";
import { solicitarRecuperacion } from "@/lib/cuenta/recuperacion";
import { encolarSinFallar } from "@/lib/emails";
import { checkRateLimit } from "@/lib/rate-limit";

const esquema = z.object({ email: z.string().trim().email().max(200) });

export async function POST(request: Request) {
  const limiteIp = await checkRateLimit("recuperar-ip", getClientIp(request.headers));
  if (!limiteIp.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limiteIp.retryAfterSeconds) } });
  }

  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalido" }, { status: 400 });

  const limiteEmail = await checkRateLimit("recuperar-email", normalizeEmail(parsed.data.email));
  if (limiteEmail.allowed) {
    await solicitarRecuperacion(getDb(), parsed.data.email, encolarSinFallar).catch((error) =>
      console.error("[cuenta] no se pudo preparar la recuperación", error)
    );
  }

  return NextResponse.json({ ok: true });
}
