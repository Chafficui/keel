import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "backend",
    include: ["src/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@keel/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
});
