import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { cambiarOrdenLibreParaTodos } from "@/lib/ajustes";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { exigirAdmin } from "@/lib/permisos";

const esquema = z.object({ ordenLibre: z.boolean() });

// Ajustes generales de la plataforma. Por ahora, el orden libre de las rutas para todos los estudiantes.
export async function PATCH(request: Request) {
  const { usuario, error } = await exigirAdmin();
  if (error) return error;
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  await cambiarOrdenLibreParaTodos(getDb(), { admin: usuario, activo: parsed.data.ordenLibre }, metaDeRequest(request));
  return NextResponse.json({ ok: true });
}
