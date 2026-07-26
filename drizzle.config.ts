import { defineConfig } from "drizzle-kit";

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/lib/db/schema.ts",
    out: "./drizzle",
    dbCredentials: {
        // Migrations and DDL should use Neon's direct connection. Retain the
        // pooled URL as a local-development fallback, never as the documented
        // production migration path.
        url:
            process.env.DATABASE_URL_UNPOOLED ??
            process.env.DATABASE_URL!,
    },
});
