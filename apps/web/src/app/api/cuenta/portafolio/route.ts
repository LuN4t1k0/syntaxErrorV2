import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { actualizarPortafolio } from "@/lib/portafolio";
import { obtenerUsuarioId } from "@/lib/sesion";

const esquema = z.object({ publico: z.boolean(), usuario: z.string().max(40).optional() });

export async function PATCH(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });

  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalido" }, { status: 400 });

  const resultado = await actualizarPortafolio(getDb(), userId, parsed.data, metaDeRequest(request));
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.motivo }, { status: resultado.motivo === "usuario_en_uso" ? 409 : 400 });
  }

  return NextResponse.json(resultado);
}
