import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { cambiarClave } from "@/lib/cuenta/perfil";
import { encolarSinFallar } from "@/lib/emails";
import { checkRateLimit } from "@/lib/rate-limit";
import { obtenerUsuarioId } from "@/lib/sesion";

const esquema = z.object({
  claveActual: z.string().min(1).max(200),
  claveNueva: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });

  const limite = await checkRateLimit("cuenta-clave", userId);
  if (!limite.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } }
    );
  }

  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalido" }, { status: 400 });

  const resultado = await cambiarClave(getDb(), userId, parsed.data, {
    encolar: encolarSinFallar,
    meta: metaDeRequest(request),
  });
  if (!resultado.ok) return NextResponse.json({ error: resultado.motivo }, { status: 400 });

  return NextResponse.json({ ok: true });
}
