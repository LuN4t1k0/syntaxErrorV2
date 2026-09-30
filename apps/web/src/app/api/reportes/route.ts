import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { encolarSinFallar } from "@/lib/emails";
import { exigirUsuario } from "@/lib/permisos";
import { checkRateLimit } from "@/lib/rate-limit";
import { crearReporte, reporteSchema } from "@/lib/reportes";

export async function POST(request: Request) {
  const { usuario, error } = await exigirUsuario();
  if (error) return error;
  const limite = await checkRateLimit("reportes", usuario.id);
  if (!limite.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } });
  }
  const parsed = reporteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const id = await crearReporte(getDb(), usuario, parsed.data, { encolar: encolarSinFallar });
  return NextResponse.json({ id }, { status: 201 });
}
