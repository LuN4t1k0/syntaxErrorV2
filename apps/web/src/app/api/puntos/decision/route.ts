import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { obtenerCaso } from "@/lib/contenido";
import { responderDecision } from "@/lib/puntos/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const esquema = z.object({ caso: slug, mision: slug, pregunta: z.string().min(1).max(1000), opcion: z.string().min(1).max(1000) });

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });

  const caso = await obtenerCaso(parsed.data.caso);
  const mision = caso?.misiones.find((candidata) => candidata.slug === parsed.data.mision);
  if (!caso || !mision) return NextResponse.json({ error: "mision_no_existe" }, { status: 404 });

  const resultado = await responderDecision(getDb(), userId, {
    casoSlug: caso.slug,
    mision,
    pregunta: parsed.data.pregunta,
    opcion: parsed.data.opcion,
  });
  if (resultado.estado === "decision_no_existe") return NextResponse.json({ error: "decision_no_existe" }, { status: 404 });
  return NextResponse.json({ correcta: resultado.correcta, puntos: resultado.puntos });
}
