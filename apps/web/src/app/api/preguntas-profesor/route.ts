import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { avisarSinFallar } from "@/lib/avisos";
import { encolarSinFallar } from "@/lib/emails";
import { exigirUsuario } from "@/lib/permisos";
import { crearPreguntaProfesor } from "@/lib/preguntas-profesor";
import { checkRateLimit } from "@/lib/rate-limit";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const esquema = z.object({ caso: slug, mision: slug, texto: z.string().trim().min(5).max(2000) });

export async function POST(request: Request) {
  const { usuario, error } = await exigirUsuario();
  if (error) return error;
  const limite = await checkRateLimit("preguntas-profesor", usuario.id);
  if (!limite.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } });
  }
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const resultado = await crearPreguntaProfesor(
    getDb(),
    { alumno: usuario, casoSlug: parsed.data.caso, mision: parsed.data.mision, texto: parsed.data.texto },
    { encolar: encolarSinFallar, avisar: avisarSinFallar }
  );
  if (!resultado.ok) return NextResponse.json({ error: resultado.motivo }, { status: 404 });
  return NextResponse.json({ id: resultado.id }, { status: 201 });
}
