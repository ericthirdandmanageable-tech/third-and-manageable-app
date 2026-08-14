import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

export * from "./schema";

// Lazy because Next imports route modules at build time to collect page data;
// reading DATABASE_URL at module scope would incorrectly make it a build secret.
let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (db) return db;

  const url = [process.env.DATABASE_URL, process.env.POSTGRES_URL].find(
    (value) => Boolean(value?.trim()),
  );
  if (!url) {
    throw new Error(
      "DATABASE_URL or POSTGRES_URL is not set. Pull the linked Neon environment for local development (see env.example).",
    );
  }

  // Must be Neon's POOLED endpoint — serverless functions exhaust direct
  // connections (VERCEL_MIGRATION_PLAN.md §2.2).
  db = drizzle(neon(url), { schema });
  return db;
}
