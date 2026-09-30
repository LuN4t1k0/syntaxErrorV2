import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", globalSetup: ["../../packages/db/src/global-setup.ts"], fileParallelism: false },
});
