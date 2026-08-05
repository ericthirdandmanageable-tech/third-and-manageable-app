import { Pool } from "@neondatabase/serverless";
import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";

import {
    BRIDGE_IDENTITY_PROVIDERS,
    type BridgeIdentityProvider,
    type CanonicalIdentityPersistence,
    type CanonicalIdentityRecord,
    type CanonicalIdentityTransaction,
} from "@/lib/canonical-identity-mapping";
import { authIdentities, users } from "@/lib/db/schema";

const BRIDGE_DISPLAY_NAME = "Member";
const ADVISORY_LOCK_NAMESPACE = "third-and-manageable:mobile-auth:v1:";

function getDatabaseUrl(): string {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error(
            "DATABASE_URL is not set. The Neon Marketplace integration injects it; run `vercel env pull` for local development (see env.example).",
        );
    }

    return url;
}

/**
 * Uses a request-scoped WebSocket pool because neon-http does not support
 * interactive transactions. The pool is always closed before the exchange
 * returns so a serverless invocation cannot retain a database connection.
 */
export function createNeonCanonicalIdentityPersistence(): CanonicalIdentityPersistence {
    return {
        async transaction<T>(
            operation: (
                transaction: CanonicalIdentityTransaction,
            ) => Promise<T>,
        ): Promise<T> {
            const pool = new Pool({ connectionString: getDatabaseUrl() });
            const db = drizzle(pool);

            try {
                return await db.transaction(async (databaseTransaction) => {
                    const transaction: CanonicalIdentityTransaction = {
                        async lockProviderAccountId(providerAccountId) {
                            const lockKey = `${ADVISORY_LOCK_NAMESPACE}${providerAccountId}`;
                            await databaseTransaction.execute(
                                sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
                            );
                        },
                        async findBridgeIdentities(providerAccountId) {
                            const rows = await databaseTransaction
                                .select({
                                    provider: authIdentities.provider,
                                    providerAccountId:
                                        authIdentities.providerAccountId,
                                    userId: authIdentities.userId,
                                })
                                .from(authIdentities)
                                .where(
                                    and(
                                        eq(
                                            authIdentities.providerAccountId,
                                            providerAccountId,
                                        ),
                                        inArray(
                                            authIdentities.provider,
                                            BRIDGE_IDENTITY_PROVIDERS,
                                        ),
                                    ),
                                );

                            return rows as CanonicalIdentityRecord[];
                        },
                        async createCanonicalUser() {
                            const [created] = await databaseTransaction
                                .insert(users)
                                .values({ displayName: BRIDGE_DISPLAY_NAME })
                                .returning({ userId: users.id });

                            if (!created) {
                                throw new Error(
                                    "Canonical user creation returned no row",
                                );
                            }

                            return created.userId;
                        },
                        async insertBridgeIdentity(identity) {
                            await databaseTransaction.insert(authIdentities).values({
                                userId: identity.userId,
                                provider: identity.provider,
                                providerAccountId: identity.providerAccountId,
                                lastLoginAt: new Date(),
                            });
                        },
                        async markBridgeIdentitiesUsed(providerAccountId) {
                            const now = new Date();
                            await databaseTransaction
                                .update(authIdentities)
                                .set({ lastLoginAt: now, updatedAt: now })
                                .where(
                                    and(
                                        eq(
                                            authIdentities.providerAccountId,
                                            providerAccountId,
                                        ),
                                        inArray(
                                            authIdentities.provider,
                                            BRIDGE_IDENTITY_PROVIDERS as readonly BridgeIdentityProvider[],
                                        ),
                                    ),
                                );
                        },
                    };

                    return operation(transaction);
                });
            } finally {
                await pool.end();
            }
        },
    };
}
