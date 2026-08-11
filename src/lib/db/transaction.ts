import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import WebSocket from "ws";

import * as schema from "./schema";

neonConfig.webSocketConstructor = WebSocket;

const CONNECTION_TIMEOUT_MS = 10_000;

export type NeonTransaction = Parameters<
  Parameters<ReturnType<typeof drizzle<typeof schema>>["transaction"]>[0]
>[0];

function transactionalDatabaseUrl(): string {
  const url = [
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
  ].find((value) => Boolean(value?.trim()));
  if (!url) throw new Error("A Neon database URL is required");
  return url;
}

/**
 * neon-http deliberately has no interactive transaction support. Mutations
 * that span multiple rows use a request-scoped WebSocket transaction and close
 * it before the serverless invocation returns.
 */
export async function withNeonTransaction<T>(
  operation: (tx: NeonTransaction) => Promise<T>,
): Promise<T> {
  const pool = new Pool({
    connectionString: transactionalDatabaseUrl(),
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });
  pool.on("error", () => console.error("Neon athlete API pool error"));
  const db = drizzle(pool, { schema });
  try {
    return await db.transaction(operation);
  } finally {
    await pool.end();
  }
}
