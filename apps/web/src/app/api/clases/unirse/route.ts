import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { unirseAClase } from "@/lib/clases/servicio";
import { encolarSinFallar } from "@/lib/emails";
import { exigirUsuario } from "@/lib/permisos";
import { checkRateLimit } from "@/lib/rate-limit";

const esquema = z.object({ codigo: z.string().min(1).max(20) });

export async function POST(request: Request) {
  const { usuario, error } = await exigirUsuario();
  if (error) return error;
  const limite = await checkRateLimit("clases-unirse", usuario.id);
  if (!limite.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } });
  }
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const resultado = await unirseAClase(getDb(), { userId: usuario.id, codigo: parsed.data.codigo }, { encolar: encolarSinFallar });
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.motivo }, { status: resultado.motivo === "codigo_invalido" ? 404 : 400 });
  }
  return NextResponse.json({ estado: resultado.estado, clase: resultado.clase });
}
