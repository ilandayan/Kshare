import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Worktrees Claude (copies du repo) — ne pas linter.
    ".claude/**",
  ]),
  {
    // Règles expérimentales du React Compiler (eslint-plugin-react-hooks v6) :
    // très strictes sur du code existant. On les garde visibles en warning
    // plutôt que bloquantes en erreur, le temps d'un refactor progressif.
    rules: {
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
]);

export default eslintConfig;
