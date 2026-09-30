import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { otorgarCertificados } from "@/lib/certificados/otorgar";
import { encolarSinFallar } from "@/lib/emails";
import { entregableSchema } from "@/lib/progreso/esquemas";
import { ErrorProgreso, guardarEntregable } from "@/lib/progreso/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = entregableSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "url_invalida" }, { status: 400 });
  try {
    const db = getDb();
    const resultado = await guardarEntregable(db, userId, parsed.data);
    const certificados = resultado.casoCompleto ? await otorgarCertificados(db, userId, parsed.data.caso, encolarSinFallar) : [];
    return NextResponse.json({ ...resultado, certificados });
  } catch (error) {
    if (error instanceof ErrorProgreso) return NextResponse.json({ error: error.codigo }, { status: 404 });
    throw error;
  }
}
