import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp } from "@/lib/client-ip";
import { obtenerCaso } from "@/lib/contenido";
import { urlRepositorio } from "@/lib/entregables/github";
import { resolverObjetivo, revisorDesdeEntorno } from "@/lib/github/revisor";
import { checkRateLimit } from "@/lib/rate-limit";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const cuerpoSchema = z.object({
  caso: slug,
  mision: slug,
  tarea: slug,
  usuario: z.string().trim().max(39).optional(),
  url: z.string().trim().max(500).optional(),
});

// Revisa en GitHub una tarea del Caso 0. Los requisitos salen del contenido, nunca del navegador.
export async function POST(request: Request) {
  const parsed = cuerpoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const limite = await checkRateLimit("github", getClientIp(request.headers));
  if (!limite.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } });
  }
  const caso = await obtenerCaso(parsed.data.caso);
  const mision = caso?.misiones.find((candidata) => candidata.slug === parsed.data.mision);
  const tarea = mision?.bloques.find((bloque) => bloque.tipo === "GithubTask" && bloque.props.id === parsed.data.tarea);
  if (tarea?.tipo !== "GithubTask") return NextResponse.json({ error: "tarea_no_existe" }, { status: 404 });

  const objetivo = resolverObjetivo(tarea.props.repositorio, { usuario: parsed.data.usuario, url: parsed.data.url });
  if (!objetivo) return NextResponse.json({ error: tarea.props.repositorio ? "usuario_invalido" : "url_invalida" }, { status: 400 });
  const revision = await revisorDesdeEntorno()(objetivo, tarea.props.requisitos);
  return NextResponse.json({ ...revision, repositorio: urlRepositorio(objetivo) });
}
