import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { cambiarEstadoClase } from "@/lib/clases/servicio";
import { exigirDocente } from "@/lib/permisos";
import { esUuid } from "@/lib/uuid";

const esquema = z.object({ estado: z.enum(["activa", "archivada"]) });

// Archivar o restaurar una clase propia.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { usuario, error } = await exigirDocente();
  if (error) return error;
  const { id } = await params;
  if (!esUuid(id)) return NextResponse.json({ error: "no_existe" }, { status: 404 });
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const cambiado = await cambiarEstadoClase(getDb(), { profesorId: usuario.id, claseId: id, estado: parsed.data.estado });
  if (!cambiado) return NextResponse.json({ error: "no_existe" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
