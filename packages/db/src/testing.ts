import { sql } from "drizzle-orm";
import { createDb, type AppDb } from "./client";

export function createTestDb() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST is not set");
  return createDb(url);
}

export async function truncateAll(db: AppDb): Promise<void> {
  const rows = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`
  );
  const tables = [...rows].map((row) => `"${row.tablename}"`);
  if (tables.length === 0) return;
  await db.execute(sql.raw(`TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`));
}
