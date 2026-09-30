import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { encolarSinFallar } from "@/lib/emails";
import { crearResena, miResena, resumenResenas } from "@/lib/resenas";
import { obtenerUsuarioId } from "@/lib/sesion";

export const dynamic = "force-dynamic";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const esquema = z.object({
  caso: slug,
  estrellas: z.number().int().min(1).max(5),
  comentario: z.string().max(1000).optional(),
});
const ESTADOS = { caso_no_existe: 404, no_completado: 403, ya_reseno: 409 } as const;

export async function GET(request: Request) {
  const caso = new URL(request.url).searchParams.get("caso");
  if (!caso || !slug.safeParse(caso).success) return NextResponse.json({ error: "falta_caso" }, { status: 400 });
  const db = getDb();
  const [resumen, mia] = await Promise.all([resumenResenas(db, caso), obtenerUsuarioId().then((userId) => miResena(db, userId, caso))]);
  if (!resumen || !mia) return NextResponse.json({ error: "caso_no_existe" }, { status: 404 });
  return NextResponse.json({ ...resumen, mia }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const resultado = await crearResena(
    getDb(),
    { userId, casoSlug: parsed.data.caso, estrellas: parsed.data.estrellas, comentario: parsed.data.comentario ?? null },
    { encolar: encolarSinFallar }
  );
  if (!resultado.ok) return NextResponse.json({ error: resultado.motivo }, { status: ESTADOS[resultado.motivo] });
  return NextResponse.json({ ok: true }, { status: 201 });
}
