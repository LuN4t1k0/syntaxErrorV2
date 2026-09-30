import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { obtenerUsuarioId } from "@/lib/sesion";
import { consultarPregunta } from "@/lib/tutor/servicio";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "no_encontrada" }, { status: 404 });
  const pregunta = await consultarPregunta(getDb(), userId, id);
  if (!pregunta) return NextResponse.json({ error: "no_encontrada" }, { status: 404 });
  return NextResponse.json(pregunta, { headers: { "Cache-Control": "no-store" } });
}
