import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

export * from "./schema";

// Lazy, for the same reason as `getAdminDb()`: Next imports every route module at
// build time, so reading DATABASE_URL at module scope would make it a *build*
// requirement rather than a runtime one.
let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
    if (db) return db;

    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error(
            "DATABASE_URL is not set. The Neon Marketplace integration injects it; run `vercel env pull` for local development (see env.example).",
        );
    }

    // Must be Neon's POOLED endpoint — serverless functions exhaust direct
    // connections (VERCEL_MIGRATION_PLAN.md §2.2).
    db = drizzle(neon(url), { schema });
    return db;
}
