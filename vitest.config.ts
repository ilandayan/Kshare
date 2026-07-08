import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    // Tests unitaires uniquement. Les specs e2e (tests/e2e/*.spec.ts) sont
    // exécutées par Playwright (npm run test:e2e), pas par vitest. On exclut
    // aussi les worktrees Claude qui contiennent des copies du repo.
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["node_modules/**", ".claude/**", "tests/e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
