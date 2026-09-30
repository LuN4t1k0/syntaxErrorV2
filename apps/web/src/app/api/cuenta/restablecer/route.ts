import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { restablecerClave } from "@/lib/cuenta/recuperacion";
import { encolarSinFallar } from "@/lib/emails";
import { resetRateLimit } from "@/lib/rate-limit";

const esquema = z.object({ token: z.string().min(10).max(200), claveNueva: z.string().min(8).max(200) });

export async function POST(request: Request) {
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "clave_corta" }, { status: 400 });

  const resultado = await restablecerClave(getDb(), parsed.data.token, parsed.data.claveNueva, {
    encolar: encolarSinFallar,
    meta: metaDeRequest(request),
  });
  if (!resultado.ok) return NextResponse.json({ error: resultado.motivo }, { status: 400 });

  await resetRateLimit("login-email", resultado.email).catch(() => {});
  return NextResponse.json({ ok: true });
}
