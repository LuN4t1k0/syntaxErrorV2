import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { listarCasosDelUsuario } from "@/lib/progreso/servicio";
import type { AvanceCaso } from "@/lib/rutas/mapa";
import { obtenerUsuarioId } from "@/lib/sesion";

export const dynamic = "force-dynamic";

// El avance de la persona en cada caso que empezó, para el mapa de la ruta (la página de la ruta es estática).
export async function GET() {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const casos: Record<string, AvanceCaso> = {};
  for (const caso of await listarCasosDelUsuario(getDb(), userId)) casos[caso.slug] = { aprobadas: caso.misionesAprobadas, completo: caso.completo };
  return NextResponse.json({ casos }, { headers: { "Cache-Control": "no-store" } });
}
