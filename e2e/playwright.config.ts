import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  retries: 0,
  // En desarrollo la primera visita a una página la compila; 5 s no siempre alcanzan.
  expect: { timeout: 15_000 },
  // Contra next dev (que compila cada página al vuelo) se corre con menos navegadores en paralelo:
  // con los de por defecto (la mitad de los núcleos) el servidor no alcanza a responder a tiempo.
  workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : undefined,
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
});
