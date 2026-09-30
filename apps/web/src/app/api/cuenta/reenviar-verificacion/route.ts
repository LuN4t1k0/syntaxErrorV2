import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { reenviarVerificacion } from "@/lib/cuenta/verificacion";
import { encolarEmail } from "@/lib/emails";
import { checkRateLimit } from "@/lib/rate-limit";
import { obtenerUsuarioId } from "@/lib/sesion";

export async function POST() {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const limite = await checkRateLimit("reenviar-verificacion", userId);
  if (!limite.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } }
    );
  }
  try {
    return NextResponse.json({ estado: await reenviarVerificacion(getDb(), userId, encolarEmail) });
  } catch (error) {
    console.error("[cuenta] no se pudo reenviar la verificación", error);
    return NextResponse.json({ error: "cola_no_disponible" }, { status: 503 });
  }
}
