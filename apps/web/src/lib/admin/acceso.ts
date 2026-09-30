import { notFound, redirect } from "next/navigation";
import { obtenerUsuarioActual, type UsuarioActual } from "@/lib/sesion";

export async function adminDePagina(ruta: string): Promise<UsuarioActual> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect(`/login?callbackUrl=${encodeURIComponent(ruta)}`);
  if (usuario.rol !== "admin") notFound();
  return usuario;
}
