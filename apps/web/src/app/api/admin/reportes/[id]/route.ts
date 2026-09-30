import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { resolverReporte } from "@/lib/admin/moderacion";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { encolarSinFallar } from "@/lib/emails";
import { exigirAdmin } from "@/lib/permisos";
import { esUuid } from "@/lib/uuid";

const esquema = z.object({ util: z.boolean(), respuesta: z.object({ asunto: z.string().trim().min(1).max(150), cuerpo: z.string().trim().min(1).max(4000) }).nullable() });
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { usuario, error } = await exigirAdmin(); if (error) return error;
  const { id } = await params; if (!esUuid(id)) return NextResponse.json({ error: "no_existe" }, { status: 404 });
  const parsed = esquema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const ok = await resolverReporte(getDb(), { reporteId: id, admin: usuario, util: parsed.data.util, respuesta: parsed.data.respuesta }, { encolar: encolarSinFallar, meta: metaDeRequest(request) });
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "no_existe" }, { status: 404 });
}
