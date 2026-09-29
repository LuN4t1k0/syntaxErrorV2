import { runMigrations } from "./migrate";

export default async function setup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST is not set");
  await runMigrations(url);
}
