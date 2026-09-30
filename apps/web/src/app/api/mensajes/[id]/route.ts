import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { marcarLeido } from "@/lib/mensajes";
import { exigirUsuario } from "@/lib/permisos";
import { esUuid } from "@/lib/uuid";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { usuario, error } = await exigirUsuario();
  if (error) return error;
  const { id } = await params;
  if (!esUuid(id) || !(await marcarLeido(getDb(), usuario.id, id))) {
    return NextResponse.json({ error: "no_existe" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
