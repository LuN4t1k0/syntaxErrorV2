import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { solicitarCambioEmail } from "@/lib/cuenta/perfil";
import { encolarEmail } from "@/lib/emails";
import { checkRateLimit } from "@/lib/rate-limit";
import { obtenerUsuarioId } from "@/lib/sesion";

const esquema = z.object({
  nuevoEmail: z.string().trim().email().max(200),
  claveActual: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });

  const limite = await checkRateLimit("cuenta-email", userId);
  if (!limite.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } }
    );
  }

  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalido" }, { status: 400 });

  let resultado: Awaited<ReturnType<typeof solicitarCambioEmail>>;
  try {
    resultado = await solicitarCambioEmail(getDb(), userId, parsed.data, {
      encolar: encolarEmail,
      meta: metaDeRequest(request),
    });
  } catch (error) {
    console.error("[cuenta] no se pudo pedir el cambio de email", error);
    return NextResponse.json({ error: "cola_no_disponible" }, { status: 503 });
  }

  if (!resultado.ok) {
    return NextResponse.json(
      { error: resultado.motivo },
      { status: resultado.motivo === "email_en_uso" ? 409 : 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
