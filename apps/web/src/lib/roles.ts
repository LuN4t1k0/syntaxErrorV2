import { eq } from "drizzle-orm";
import type { DbClient } from "@syntaxerror/db/client";
import { users } from "@syntaxerror/db/schema";

export const ROLES = ["student", "teacher", "admin"] as const;
export type Rol = (typeof ROLES)[number];
export type Persona = { id: string; email: string; nombre: string | null };

export function esRol(valor: string): valor is Rol {
  return (ROLES as readonly string[]).includes(valor);
}

export function esDocente(usuario: { rol: Rol }): boolean {
  return usuario.rol === "teacher" || usuario.rol === "admin";
}

export async function listarAdmins(db: DbClient): Promise<Persona[]> {
  return db.select({ id: users.id, email: users.email, nombre: users.name }).from(users).where(eq(users.role, "admin"));
}
