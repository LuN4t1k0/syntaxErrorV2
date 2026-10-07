import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { exigirUsuario } from "@/lib/permisos";
import { guardarRutaElegida } from "@/lib/rutas/estado";

const esquema = z.object({ ruta: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) });

export async function PUT(request: Request) {
  const { usuario, error } = await exigirUsuario();
  if (error) return error;
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const resultado = await guardarRutaElegida(getDb(), usuario.id, parsed.data.ruta, true);
  if (resultado === "no_disponible") return NextResponse.json({ error: "ruta_no_disponible" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
