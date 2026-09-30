import { NextResponse } from "next/server";
import { esDocente } from "./roles";
import { obtenerUsuarioActual, type UsuarioActual } from "./sesion";

export type Acceso = { usuario: UsuarioActual; error: null } | { usuario: null; error: NextResponse };

export async function exigirUsuario(): Promise<Acceso> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) return { usuario: null, error: NextResponse.json({ error: "no_autenticado" }, { status: 401 }) };
  return { usuario, error: null };
}

export async function exigirDocente(): Promise<Acceso> {
  const acceso = await exigirUsuario();
  if (acceso.error || esDocente(acceso.usuario)) return acceso;
  return { usuario: null, error: NextResponse.json({ error: "prohibido" }, { status: 403 }) };
}
