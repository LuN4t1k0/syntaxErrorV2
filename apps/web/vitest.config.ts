import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    globalSetup: ["../../packages/db/src/global-setup.ts"],
    fileParallelism: false,
    env: { DATABASE_URL: process.env.DATABASE_URL_TEST ?? "" },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
