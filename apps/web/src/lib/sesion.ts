import { auth } from "./auth";

export async function obtenerUsuarioId(): Promise<string | null> {
  const sesion = await auth();
  return sesion?.user?.id ?? null;
}
