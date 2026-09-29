import { createDb } from "@syntaxerror/db/client";
import { seedAdmin } from "./seed";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const email = process.env.SEED_ADMIN_EMAIL ?? "admin@local.test";
const password = process.env.SEED_ADMIN_PASSWORD;
if (!password) throw new Error("SEED_ADMIN_PASSWORD is required");

async function main(databaseUrl: string, adminPassword: string) {
  const { db, close } = createDb(databaseUrl);
  try {
    await seedAdmin(db, { email, password: adminPassword });
  } finally {
    await close();
  }
  console.log(`[seed] admin listo: ${email}`);
}

main(url, password).catch((error) => {
  console.error(error);
  process.exit(1);
});
