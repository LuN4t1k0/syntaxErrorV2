import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { actualizarNombre, eliminarCuenta } from "@/lib/cuenta/perfil";
import { encolarSinFallar } from "@/lib/emails";
import { cerrarSesion, obtenerUsuarioId } from "@/lib/sesion";

const nombreSchema = z.object({ nombre: z.string().trim().min(1).max(120) });
const eliminarSchema = z.object({ confirmacion: z.string().min(1).max(200) });

export async function PATCH(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });

  const parsed = nombreSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalido" }, { status: 400 });

  await actualizarNombre(getDb(), userId, parsed.data.nombre, metaDeRequest(request));
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });

  const parsed = eliminarSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalido" }, { status: 400 });

  const resultado = await eliminarCuenta(getDb(), userId, parsed.data.confirmacion, {
    encolar: encolarSinFallar,
    meta: metaDeRequest(request),
  });
  if (!resultado.ok) return NextResponse.json({ error: resultado.motivo }, { status: 400 });

  await cerrarSesion();
  return NextResponse.json({ ok: true });
}
