import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 30_000,
    globalSetup: ["../db/src/global-setup.ts"],
    fileParallelism: false,
  },
});
