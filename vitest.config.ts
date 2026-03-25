import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    projects: [
      "packages/shared",
      "packages/backend",
      "packages/frontend",
      "cli",
    ],
  },
  resolve: {
    alias: {
      "@keel/shared": resolve(__dirname, "packages/shared/src"),
    },
  },
});
