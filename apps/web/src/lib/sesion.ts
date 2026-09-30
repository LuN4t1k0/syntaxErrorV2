import { auth, signOut } from "./auth";

export async function obtenerUsuarioId(): Promise<string | null> {
  const sesion = await auth();
  return sesion?.user?.id ?? null;
}

export async function cerrarSesion(): Promise<void> {
  await signOut({ redirect: false });
}
