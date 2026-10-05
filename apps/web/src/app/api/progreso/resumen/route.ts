import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { accesoBeta } from "@/lib/beta";
import { casosSoloParaProbadores } from "@/lib/contenido";
import { tieneOrdenLibre } from "@/lib/progreso/orden";
import { listarCasosDelUsuario } from "@/lib/progreso/servicio";
import type { AvanceCaso } from "@/lib/rutas/mapa";
import { obtenerUsuarioId } from "@/lib/sesion";

export const dynamic = "force-dynamic";

// El avance de la persona en cada caso que empezó, para el mapa de la ruta (la página de la ruta es estática), y si
// tiene el orden libre, para no mostrarle bloqueos.
export async function GET() {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const casos: Record<string, AvanceCaso> = {};
  for (const caso of await listarCasosDelUsuario(getDb(), userId)) casos[caso.slug] = { aprobadas: caso.misionesAprobadas, completo: caso.completo };
  // accesoBeta: si puede hacer las rutas en beta (probador o admin; todos con los borradores a la vista).
  const conBeta = (await casosSoloParaProbadores()).size === 0 || (await accesoBeta(getDb(), userId));
  return NextResponse.json({ casos, ordenLibre: await tieneOrdenLibre(getDb(), userId), accesoBeta: conBeta }, { headers: { "Cache-Control": "no-store" } });
}
