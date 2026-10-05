import { eq } from "drizzle-orm";
import type { DbClient } from "@syntaxerror/db/client";
import { users } from "@syntaxerror/db/schema";
import { ordenLibreParaTodos } from "@/lib/ajustes";
import { incluirBorradores } from "@/lib/contenido";
import type { OpcionesRequisitos } from "./requisitos";

// Sin bloqueos de orden: los probadores, o todos si un admin encendió el orden libre para todos.
export async function tieneOrdenLibre(db: DbClient, userId: string): Promise<boolean> {
  const [fila] = await db.select({ probador: users.probador }).from(users).where(eq(users.id, userId));
  if (fila?.probador) return true;
  return ordenLibreParaTodos(db);
}

// Las opciones con que el servicio de progreso aplica el orden para esta persona.
export async function opcionesDeProgreso(db: DbClient, userId: string): Promise<OpcionesRequisitos> {
  return { incluirBorradores: incluirBorradores(), ordenLibre: await tieneOrdenLibre(db, userId) };
}
