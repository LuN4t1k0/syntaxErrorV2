import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { exigirAccesoBeta } from "@/lib/beta";
import { otorgarCertificados } from "@/lib/certificados/otorgar";
import { certificadosDelCaso } from "@/lib/certificados/servicio";
import { encolarSinFallar } from "@/lib/emails";
import { intentoSchema } from "@/lib/progreso/esquemas";
import { opcionesDeProgreso } from "@/lib/progreso/orden";
import { ErrorProgreso, estadoHttp, obtenerProgresoCaso, registrarIntento } from "@/lib/progreso/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const caso = new URL(request.url).searchParams.get("caso");
  if (!caso) return NextResponse.json({ error: "falta_caso" }, { status: 400 });
  const db = getDb();
  const bloqueo = await exigirAccesoBeta(db, userId, caso);
  if (bloqueo) return bloqueo;
  const progreso = await obtenerProgresoCaso(db, userId, caso, await opcionesDeProgreso(db, userId));
  if (!progreso) return NextResponse.json({ error: "caso_no_existe" }, { status: 404 });
  const certificados = await certificadosDelCaso(db, userId, caso);
  return NextResponse.json({ ...progreso, certificados }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = intentoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  try {
    const db = getDb();
    const bloqueo = await exigirAccesoBeta(db, userId, parsed.data.caso);
    if (bloqueo) return bloqueo;
    const resultado = await registrarIntento(db, userId, parsed.data, await opcionesDeProgreso(db, userId));
    const certificados = resultado.casoCompleto ? await otorgarCertificados(db, userId, parsed.data.caso, encolarSinFallar) : [];
    return NextResponse.json({ ...resultado, certificados });
  } catch (error) {
    if (error instanceof ErrorProgreso) return NextResponse.json({ error: error.codigo }, { status: estadoHttp(error.codigo) });
    throw error;
  }
}
