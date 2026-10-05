import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { accesoBeta } from "@/lib/beta";
import { otorgarCertificados } from "@/lib/certificados/otorgar";
import type { CertificadoEmitido } from "@/lib/certificados/servicio";
import { casosSoloParaProbadores } from "@/lib/contenido";
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
  // Los intentos en casos solo para probadores, de quien no lo es, se rechazan como cualquier intento inválido.
  const soloBeta = await casosSoloParaProbadores();
  const conAcceso = soloBeta.size === 0 || (await accesoBeta(db, userId));
  const intentos = conAcceso ? parsed.data.intentos : parsed.data.intentos.filter((intento) => !soloBeta.has(intento.caso));
  const aplicado = await sincronizarIntentos(db, userId, intentos, await opcionesDeProgreso(db, userId));
  const resultado = { ...aplicado, rechazados: aplicado.rechazados + parsed.data.intentos.length - intentos.length };
  const certificados: CertificadoEmitido[] = [];
  for (const caso of new Set(intentos.map((intento) => intento.caso))) {
    certificados.push(...(await otorgarCertificados(db, userId, caso, encolarSinFallar)));
  }
  return NextResponse.json({ ...resultado, certificados });
}
