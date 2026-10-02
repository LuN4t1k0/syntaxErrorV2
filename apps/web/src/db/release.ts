import path from "node:path";
import { createDb } from "@syntaxerror/db/client";
import { runMigrations } from "@syntaxerror/db/migrate";
import { cargarContenido } from "@syntaxerror/content/cargar";
import { sincronizarContenido } from "@syntaxerror/content/sincronizar";
import { seedAdmin } from "./seed";

// Lee DATABASE_URL, MIGRATIONS_DIR, CONTENT_DIR, SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD.
export type EntornoRelease = Record<string, string | undefined>;

// Lo que corre antes de cada deploy, en orden: migra la base, sincroniza el contenido y, si hay clave, deja listo el admin.
// Cada paso es idempotente: correrlo dos veces deja todo igual.
export async function release(entorno: EntornoRelease, registrar: (linea: string) => void = console.log): Promise<void> {
  const url = entorno.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  await runMigrations(url, entorno.MIGRATIONS_DIR);
  registrar("[release] migraciones aplicadas");

  const { db, close } = createDb(url);
  try {
    const contenido = await cargarContenido(entorno.CONTENT_DIR ?? path.resolve(process.cwd(), "../../content"));
    const resultado = await sincronizarContenido(db, contenido);
    registrar(`[release] contenido: ${resultado.rutas} rutas, ${resultado.casos} casos`);
    if (entorno.SEED_ADMIN_PASSWORD) {
      const email = entorno.SEED_ADMIN_EMAIL ?? "admin@local.test";
      await seedAdmin(db, { email, password: entorno.SEED_ADMIN_PASSWORD });
      registrar(`[release] admin listo: ${email}`);
    }
  } finally {
    await close();
  }
}
