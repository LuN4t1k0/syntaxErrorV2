import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { avisarSinFallar } from "@/lib/avisos";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { encolarSinFallar } from "@/lib/emails";
import { exigirDocente } from "@/lib/permisos";
import { responderPregunta } from "@/lib/preguntas-profesor";
import { esUuid } from "@/lib/uuid";

const esquema = z.object({ respuesta: z.string().trim().min(1).max(4000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { usuario, error } = await exigirDocente();
  if (error) return error;
  const { id } = await params;
  if (!esUuid(id)) return NextResponse.json({ error: "no_existe" }, { status: 404 });
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const resultado = await responderPregunta(
    getDb(),
    { preguntaId: id, respuesta: parsed.data.respuesta, actor: usuario },
    { encolar: encolarSinFallar, avisar: avisarSinFallar, meta: metaDeRequest(request) }
  );
  if (!resultado.ok) return NextResponse.json({ error: resultado.motivo }, { status: resultado.motivo === "prohibido" ? 403 : 404 });
  return NextResponse.json({ ok: true });
}
