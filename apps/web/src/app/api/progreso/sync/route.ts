import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { otorgarCertificados } from "@/lib/certificados/otorgar";
import type { CertificadoEmitido } from "@/lib/certificados/servicio";
import { encolarSinFallar } from "@/lib/emails";
import { sincronizacionSchema } from "@/lib/progreso/esquemas";
import { opcionesDeProgreso } from "@/lib/progreso/orden";
import { sincronizarIntentos } from "@/lib/progreso/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = sincronizacionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const db = getDb();
  const resultado = await sincronizarIntentos(db, userId, parsed.data.intentos, await opcionesDeProgreso(db, userId));
  const certificados: CertificadoEmitido[] = [];
  for (const caso of new Set(parsed.data.intentos.map((intento) => intento.caso))) {
    certificados.push(...(await otorgarCertificados(db, userId, caso, encolarSinFallar)));
  }
  return NextResponse.json({ ...resultado, certificados });
}
