import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { cambiarProbador, cambiarRol, eliminarUsuario } from "@/lib/admin/usuarios";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { encolarSinFallar } from "@/lib/emails";
import { exigirAdmin } from "@/lib/permisos";
import { ROLES } from "@/lib/roles";
import { esUuid } from "@/lib/uuid";

const rolSchema = z.object({ rol: z.enum(ROLES) });
// Un admin también puede marcarse a sí mismo como probador, para recorrer las rutas en beta.
const probadorSchema = z.object({ probador: z.boolean() });
const eliminarSchema = z.object({ confirmacion: z.string().min(1).max(320) });
const noExiste = () => NextResponse.json({ error: "no_existe" }, { status: 404 });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { usuario, error } = await exigirAdmin();
  if (error) return error;
  const { id } = await params;
  if (!esUuid(id)) return noExiste();
  const cuerpo = await request.json().catch(() => null);
  const probador = probadorSchema.safeParse(cuerpo);
  if (probador.success) {
    const resultado = await cambiarProbador(getDb(), { admin: usuario, userId: id, probador: probador.data.probador }, metaDeRequest(request));
    return resultado === "no_existe" ? noExiste() : NextResponse.json({ ok: true });
  }
  const parsed = rolSchema.safeParse(cuerpo);
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const resultado = await cambiarRol(getDb(), { admin: usuario, userId: id, rol: parsed.data.rol }, metaDeRequest(request));
  if (resultado === "no_existe") return noExiste();
  if (resultado === "propio") return NextResponse.json({ error: "propio" }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { usuario, error } = await exigirAdmin();
  if (error) return error;
  const { id } = await params;
  if (!esUuid(id)) return noExiste();
  const parsed = eliminarSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const resultado = await eliminarUsuario(getDb(), { admin: usuario, userId: id, confirmacion: parsed.data.confirmacion }, { encolar: encolarSinFallar, meta: metaDeRequest(request) });
  if (resultado === "no_existe") return noExiste();
  if (resultado !== "ok") return NextResponse.json({ error: resultado }, { status: 400 });
  return NextResponse.json({ ok: true });
}
