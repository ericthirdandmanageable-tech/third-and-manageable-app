import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        // Mirror the `@/*` path alias from tsconfig.json so tests can import
        // application modules the same way the application does.
        alias: { "@": path.resolve(__dirname, "src") },
    },
    test: {
        include: ["tests/**/*.test.ts"],
    },
});
