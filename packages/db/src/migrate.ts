import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// En producción las migraciones viajan junto al script empaquetado: ahí import.meta.url ya no apunta a este paquete.
const CARPETA_POR_DEFECTO = fileURLToPath(new URL("../drizzle", import.meta.url));

export async function runMigrations(connectionString: string, migrationsFolder = CARPETA_POR_DEFECTO): Promise<void> {
  const client = postgres(connectionString, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder });
  } finally {
    await client.end();
  }
}
