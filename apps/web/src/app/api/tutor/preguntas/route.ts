import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { obtenerCaso } from "@/lib/contenido";
import { checkRateLimit } from "@/lib/rate-limit";
import { obtenerUsuarioId } from "@/lib/sesion";
import { estadoTutor } from "@/lib/tutor/acceso";
import { encolarTutor } from "@/lib/tutor/cola";
import { proveedorIA } from "@/lib/tutor/proveedor";
import { preguntarAlTutor } from "@/lib/tutor/servicio";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const esquema = z.object({
  caso: slug,
  mision: slug,
  pregunta: z.string().trim().min(1).max(500),
  clientId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
});

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const limite = await checkRateLimit("tutor", userId);
  if (!limite.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } });
  }
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalido" }, { status: 400 });

  const caso = await obtenerCaso(parsed.data.caso);
  const mision = caso?.misiones.find((candidata) => candidata.slug === parsed.data.mision);
  if (!caso || !mision) return NextResponse.json({ error: "mision_no_existe" }, { status: 404 });

  // Primero intentar: el tutor se habilita tras los intentos fallidos de la misión (propuesta, sección 6).
  const acceso = await estadoTutor(getDb(), userId, caso.slug, { slug: mision.slug, sinGuia: mision.sinGuia });
  if (!acceso.habilitado) {
    return NextResponse.json({ error: "tutor_bloqueado", fallidos: acceso.fallidos, umbral: acceso.umbral }, { status: 403 });
  }

  const resultado = await preguntarAlTutor(
    getDb(),
    { userId, caso, mision, pregunta: parsed.data.pregunta, clientId: parsed.data.clientId },
    { proveedor: proveedorIA(), encolar: encolarTutor }
  );
  return NextResponse.json(resultado);
}
