import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type { DbClient } from "@syntaxerror/db/client";
import { users } from "@syntaxerror/db/schema";

// Las rutas en beta están publicadas pero ocultas: las hacen los probadores (los marca un admin) y los admins.
export async function accesoBeta(db: DbClient, userId: string): Promise<boolean> {
  const [fila] = await db.select({ probador: users.probador, rol: users.role }).from(users).where(eq(users.id, userId));
  return Boolean(fila?.probador || fila?.rol === "admin");
}

// Para las APIs de un caso: 403 si el caso solo está en rutas beta y la persona no tiene acceso.
export async function exigirAccesoBeta(db: DbClient, userId: string, casoSlug: string): Promise<NextResponse | null> {
  const { puedeUsarCaso } = await import("@/lib/rutas/estado");
  if (await puedeUsarCaso(db, userId, casoSlug)) return null;
  return NextResponse.json({ error: "ruta_no_disponible" }, { status: 403 });
}
