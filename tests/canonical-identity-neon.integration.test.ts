import { neon } from "@neondatabase/serverless";
import { beforeAll, describe, expect, it } from "vitest";

import {
    CanonicalIdentityCollisionError,
    mapCanonicalBridgeIdentities,
} from "@/lib/canonical-identity-mapping";
import { createNeonCanonicalIdentityPersistence } from "@/lib/db/canonical-identity-persistence";

const enabled = process.env.RUN_NEON_CANONICAL_IDENTITY_TEST === "1";
const TEST_DATABASE_PATTERN = /^tm_identity_test_[a-z0-9_]+$/;

function getTestClient() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required");

    const databaseName = new URL(databaseUrl).pathname.slice(1);
    if (!TEST_DATABASE_PATTERN.test(databaseName)) {
        throw new Error(
            `Refusing canonical identity integration test against non-disposable database ${databaseName}`,
        );
    }

    return neon(databaseUrl);
}

describe.runIf(enabled)("canonical identity persistence on Neon", () => {
    const persistence = createNeonCanonicalIdentityPersistence();
    let sql: ReturnType<typeof getTestClient>;

    beforeAll(() => {
        sql = getTestClient();
    });

    it("creates one canonical user and remains idempotent", async () => {
        const subject = "integration-idempotent";

        const first = await mapCanonicalBridgeIdentities(persistence, subject);
        const second = await mapCanonicalBridgeIdentities(persistence, subject);

        expect(second).toEqual(first);
        const [summary] = await sql`
            select
                count(distinct user_id)::int as users,
                count(*)::int as identities
            from auth_identities
            where provider_account_id = ${subject}
              and provider in ('appwrite', 'firebase')
        `;
        expect(summary).toEqual({ users: 1, identities: 2 });
    });

    it("attaches a missing Firebase identity to the existing canonical user", async () => {
        const subject = "integration-attach";
        const [{ id: userId }] = await sql`
            insert into users (display_name)
            values ('Existing bridge member')
            returning id
        `;
        await sql`
            insert into auth_identities (
                user_id, provider, provider_account_id
            )
            values (${userId}, 'appwrite', ${subject})
        `;

        const mapping = await mapCanonicalBridgeIdentities(
            persistence,
            subject,
        );

        expect(mapping).toEqual({
            canonicalUserId: userId,
            firebaseUid: subject,
        });
        const identities = await sql`
            select provider, user_id
            from auth_identities
            where provider_account_id = ${subject}
            order by provider
        `;
        expect(identities).toEqual([
            { provider: "appwrite", user_id: userId },
            { provider: "firebase", user_id: userId },
        ]);
    });

    it("fails closed and preserves both records when identities collide", async () => {
        const subject = "integration-collision";
        const users = await sql`
            insert into users (display_name)
            values ('Collision A'), ('Collision B')
            returning id
        `;
        await sql`
            insert into auth_identities (
                user_id, provider, provider_account_id
            )
            values
                (${users[0].id}, 'appwrite', ${subject}),
                (${users[1].id}, 'firebase', ${subject})
        `;

        await expect(
            mapCanonicalBridgeIdentities(persistence, subject),
        ).rejects.toBeInstanceOf(CanonicalIdentityCollisionError);

        const identities = await sql`
            select provider, user_id
            from auth_identities
            where provider_account_id = ${subject}
            order by provider
        `;
        expect(identities).toEqual([
            { provider: "appwrite", user_id: users[0].id },
            { provider: "firebase", user_id: users[1].id },
        ]);
    });

    it("serializes concurrent first-use mapping attempts", async () => {
        const subject = "integration-concurrent";

        const mappings = await Promise.all(
            Array.from({ length: 6 }, () =>
                mapCanonicalBridgeIdentities(persistence, subject),
            ),
        );

        expect(
            new Set(mappings.map(({ canonicalUserId }) => canonicalUserId)).size,
        ).toBe(1);
        const [summary] = await sql`
            select
                count(distinct user_id)::int as users,
                count(*)::int as identities
            from auth_identities
            where provider_account_id = ${subject}
              and provider in ('appwrite', 'firebase')
        `;
        expect(summary).toEqual({ users: 1, identities: 2 });
    });
});
