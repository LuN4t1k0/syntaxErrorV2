import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { decidirInscripcion } from "@/lib/clases/servicio";
import { encolarSinFallar } from "@/lib/emails";
import { exigirDocente } from "@/lib/permisos";
import { esUuid } from "@/lib/uuid";

const esquema = z.object({ estado: z.enum(["activa", "retirada"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { usuario, error } = await exigirDocente();
  if (error) return error;
  const { id, userId } = await params;
  if (!esUuid(id) || !esUuid(userId)) return NextResponse.json({ error: "no_existe" }, { status: 404 });
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const decidido = await decidirInscripcion(
    getDb(),
    { profesorId: usuario.id, claseId: id, userId, estado: parsed.data.estado },
    { encolar: encolarSinFallar }
  );
  if (!decidido) return NextResponse.json({ error: "no_existe" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
