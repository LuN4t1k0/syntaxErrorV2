import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDb(connectionString: string) {
  const client = postgres(connectionString, { max: 10 });
  const db = drizzle(client, { schema });
  return { db, close: () => client.end() };
}

export type AppDb = ReturnType<typeof createDb>["db"];
export type DbTransaction = Parameters<Parameters<AppDb["transaction"]>[0]>[0];
export type DbClient = AppDb | DbTransaction;

const globalForDb = globalThis as { __syntaxerrorDb?: AppDb };

export function getDb(): AppDb {
  if (!globalForDb.__syntaxerrorDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalForDb.__syntaxerrorDb = createDb(url).db;
  }
  return globalForDb.__syntaxerrorDb;
}
