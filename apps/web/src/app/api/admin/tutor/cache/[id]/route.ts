import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { borrarRespuestaCache } from "@/lib/admin/preguntas";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { exigirAdmin } from "@/lib/permisos";
import { esUuid } from "@/lib/uuid";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { usuario, error } = await exigirAdmin();
  if (error) return error;
  const { id } = await params;
  if (!esUuid(id) || !(await borrarRespuestaCache(getDb(), { id, admin: usuario }, metaDeRequest(request)))) return NextResponse.json({ error: "no_existe" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
