import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { cambiarCasoHabilitado } from "@/lib/clases/servicio";
import { exigirDocente } from "@/lib/permisos";
import { esUuid } from "@/lib/uuid";

const esquema = z.object({ habilitado: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; caso: string }> }) {
  const { usuario, error } = await exigirDocente();
  if (error) return error;
  const { id, caso } = await params;
  if (!esUuid(id)) return NextResponse.json({ error: "no_existe" }, { status: 404 });
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const cambiado = await cambiarCasoHabilitado(getDb(), { profesorId: usuario.id, claseId: id, casoSlug: caso, habilitado: parsed.data.habilitado });
  if (!cambiado) return NextResponse.json({ error: "no_existe" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
