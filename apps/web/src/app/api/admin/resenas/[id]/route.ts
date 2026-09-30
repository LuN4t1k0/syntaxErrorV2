import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { exigirAdmin } from "@/lib/permisos";
import { moderarComentario } from "@/lib/resenas";
import { esUuid } from "@/lib/uuid";

const esquema = z.object({ decision: z.enum(["aprobado", "rechazado"]) });
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { usuario, error } = await exigirAdmin(); if (error) return error;
  const { id } = await params; if (!esUuid(id)) return NextResponse.json({ error: "no_existe" }, { status: 404 });
  const parsed = esquema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const ok = await moderarComentario(getDb(), { resenaId: id, admin: usuario, decision: parsed.data.decision }, metaDeRequest(request));
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "no_existe" }, { status: 404 });
}
