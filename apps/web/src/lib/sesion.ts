import { eq } from "drizzle-orm";
import { getDb, type AppDb } from "@syntaxerror/db/client";
import { users } from "@syntaxerror/db/schema";
import { auth, signOut } from "./auth";
import { esRol, type Rol } from "./roles";

export type UsuarioActual = { id: string; email: string; nombre: string | null; rol: Rol };

export async function obtenerUsuarioId(): Promise<string | null> {
  const sesion = await auth();
  return sesion?.user?.id ?? null;
}

export async function obtenerUsuarioActual(db: AppDb = getDb()): Promise<UsuarioActual | null> {
  const id = await obtenerUsuarioId();
  if (!id) return null;
  const [fila] = await db.select({ id: users.id, email: users.email, nombre: users.name, rol: users.role }).from(users).where(eq(users.id, id));
  if (!fila) return null;
  return { ...fila, rol: esRol(fila.rol) ? fila.rol : "student" };
}

export async function cerrarSesion(): Promise<void> {
  await signOut({ redirect: false });
}
