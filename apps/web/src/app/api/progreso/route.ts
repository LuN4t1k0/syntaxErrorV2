import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { intentoSchema } from "@/lib/progreso/esquemas";
import { ErrorProgreso, obtenerProgresoCaso, registrarIntento } from "@/lib/progreso/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const caso = new URL(request.url).searchParams.get("caso");
  if (!caso) return NextResponse.json({ error: "falta_caso" }, { status: 400 });
  const progreso = await obtenerProgresoCaso(getDb(), userId, caso);
  if (!progreso) return NextResponse.json({ error: "caso_no_existe" }, { status: 404 });
  return NextResponse.json(progreso, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = intentoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  try {
    return NextResponse.json(await registrarIntento(getDb(), userId, parsed.data));
  } catch (error) {
    if (error instanceof ErrorProgreso) return NextResponse.json({ error: error.codigo }, { status: 404 });
    throw error;
  }
}
