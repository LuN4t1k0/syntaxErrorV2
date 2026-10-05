import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { obtenerCaso } from "@/lib/contenido";
import { checkRateLimit } from "@/lib/rate-limit";
import { obtenerUsuarioId } from "@/lib/sesion";
import { encolarTutor } from "@/lib/tutor/cola";
import { proveedorIA } from "@/lib/tutor/proveedor";
import { preguntarAlAsistente } from "@/lib/tutor/servicio";

const esquema = z.object({
  caso: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  pregunta: z.string().trim().min(1).max(500),
  clientId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
});

// El asistente del curso: siempre disponible para dudas de conceptos, sin los intentos que pide el tutor, porque no
// ve las tareas. El estado de la pregunta se consulta en /api/tutor/preguntas/[id] y la respuesta llega por el
// mismo socket del tutor.
export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const limite = await checkRateLimit("asistente", userId);
  if (!limite.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } });
  }
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalido" }, { status: 400 });

  const caso = await obtenerCaso(parsed.data.caso);
  if (!caso) return NextResponse.json({ error: "caso_no_existe" }, { status: 404 });

  const resultado = await preguntarAlAsistente(
    getDb(),
    { userId, caso, pregunta: parsed.data.pregunta, clientId: parsed.data.clientId },
    { proveedor: proveedorIA(), encolar: encolarTutor }
  );
  return NextResponse.json(resultado);
}
