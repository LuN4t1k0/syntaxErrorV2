import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { SIN_META } from "@/lib/cuenta/meta";
import { exportarDatos } from "@/lib/cuenta/perfil";
import { obtenerUsuarioId } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });

  const datos = await exportarDatos(getDb(), userId, SIN_META);
  if (!datos) return NextResponse.json({ error: "no_encontrado" }, { status: 404 });

  return new NextResponse(JSON.stringify(datos, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mis-datos-syntaxerror.json"',
      "Cache-Control": "no-store",
    },
  });
}
