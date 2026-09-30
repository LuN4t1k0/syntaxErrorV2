import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { sincronizacionSchema } from "@/lib/progreso/esquemas";
import { sincronizarIntentos } from "@/lib/progreso/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = sincronizacionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  return NextResponse.json(await sincronizarIntentos(getDb(), userId, parsed.data.intentos));
}
