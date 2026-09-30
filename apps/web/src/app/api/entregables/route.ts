import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { entregableSchema } from "@/lib/progreso/esquemas";
import { ErrorProgreso, guardarEntregable } from "@/lib/progreso/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = entregableSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "url_invalida" }, { status: 400 });
  try {
    return NextResponse.json(await guardarEntregable(getDb(), userId, parsed.data));
  } catch (error) {
    if (error instanceof ErrorProgreso) return NextResponse.json({ error: error.codigo }, { status: 404 });
    throw error;
  }
}
