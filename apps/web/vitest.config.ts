import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vitest 4 transforma con oxc, que toma "jsx: preserve" del tsconfig de Next: aquí se compila el JSX de verdad.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    globalSetup: ["../../packages/db/src/global-setup.ts"],
    fileParallelism: false,
    env: { DATABASE_URL: process.env.DATABASE_URL_TEST ?? "" },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
