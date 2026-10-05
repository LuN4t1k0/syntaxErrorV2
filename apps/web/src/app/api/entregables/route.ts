import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { obtenerCaso } from "@/lib/contenido";
import { encolarSinFallar } from "@/lib/emails";
import { avisarRevision } from "@/lib/entregables/revision";
import { verificadorDesdeEntorno } from "@/lib/entregables/verificador";
import { entregableSchema } from "@/lib/progreso/esquemas";
import { opcionesDeProgreso } from "@/lib/progreso/orden";
import { enviarEntregable, ErrorProgreso, estadoHttp } from "@/lib/progreso/servicio";
import { checkRateLimit } from "@/lib/rate-limit";
import { obtenerUsuarioId } from "@/lib/sesion";

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = entregableSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "url_invalida" }, { status: 400 });
  const caso = await obtenerCaso(parsed.data.caso);
  if (!caso) return NextResponse.json({ error: "caso_no_existe" }, { status: 404 });
  const limite = await checkRateLimit("entregables", userId);
  if (!limite.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } });
  }
  try {
    const db = getDb();
    const resultado = await enviarEntregable(
      db,
      userId,
      { caso: caso.slug, url: parsed.data.url, archivos: caso.archivos },
      { verificar: verificadorDesdeEntorno() },
      await opcionesDeProgreso(db, userId)
    );
    if (resultado.estado === "no_verificado") {
      return NextResponse.json({ error: "no_verificado", problemas: resultado.problemas, reintentable: resultado.reintentable }, { status: 422 });
    }
    await avisarRevision(db, { alumnoId: userId, casoSlug: caso.slug }, { encolar: encolarSinFallar });
    return NextResponse.json(resultado);
  } catch (error) {
    if (error instanceof ErrorProgreso) return NextResponse.json({ error: error.codigo }, { status: estadoHttp(error.codigo) });
    throw error;
  }
}
