import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type { DbClient } from "@syntaxerror/db/client";
import { users } from "@syntaxerror/db/schema";
import { casosSoloParaProbadores } from "@/lib/contenido";

// Las rutas en beta están publicadas pero ocultas: las hacen los probadores (los marca un admin) y los admins.
export async function accesoBeta(db: DbClient, userId: string): Promise<boolean> {
  const [fila] = await db.select({ probador: users.probador, rol: users.role }).from(users).where(eq(users.id, userId));
  return Boolean(fila?.probador || fila?.rol === "admin");
}

// Para las APIs de un caso: 403 si el caso solo está en rutas beta y la persona no tiene acceso.
export async function exigirAccesoBeta(db: DbClient, userId: string, casoSlug: string): Promise<NextResponse | null> {
  if (!(await casosSoloParaProbadores()).has(casoSlug)) return null;
  if (await accesoBeta(db, userId)) return null;
  return NextResponse.json({ error: "solo_probadores" }, { status: 403 });
}
