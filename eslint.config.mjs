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
    // The Python bridge, deleted at the end of Phase 2 (VERCEL_MIGRATION_PLAN.md §4).
    // `web-prototype/` is gone — its screens are in `src/app/(athlete)/` and its
    // registries in `src/lib/core/`.
    "backend/**",
  ]),
]);

export default eslintConfig;
