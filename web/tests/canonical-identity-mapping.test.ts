import { describe, expect, it, vi } from "vitest";

import {
    CanonicalIdentityCollisionError,
    mapCanonicalBridgeIdentities,
    type CanonicalIdentityPersistence,
    type CanonicalIdentityRecord,
    type CanonicalIdentityTransaction,
} from "@/lib/canonical-identity-mapping";

const SUBJECT = "appwrite-user-1";
const USER_ID = "00000000-0000-4000-8000-000000000001";

function createPersistence(
    initialRecords: CanonicalIdentityRecord[] = [],
): {
    persistence: CanonicalIdentityPersistence;
    records: CanonicalIdentityRecord[];
    transaction: CanonicalIdentityTransaction;
} {
    const records = structuredClone(initialRecords);
    const transaction: CanonicalIdentityTransaction = {
        lockProviderAccountId: vi.fn().mockResolvedValue(undefined),
        findBridgeIdentities: vi.fn(async (providerAccountId: string) =>
            records.filter(
                (record) => record.providerAccountId === providerAccountId,
            ),
        ),
        createCanonicalUser: vi.fn().mockResolvedValue(USER_ID),
        insertBridgeIdentity: vi.fn(async (identity) => {
            records.push(identity);
        }),
        markBridgeIdentitiesUsed: vi.fn().mockResolvedValue(undefined),
    };
    const persistence: CanonicalIdentityPersistence = {
        transaction: vi.fn(async (operation) => operation(transaction)),
    };

    return { persistence, records, transaction };
}

describe("canonical mobile bridge identity transaction", () => {
    it("creates one canonical user and both provider mappings atomically", async () => {
        const { persistence, records, transaction } = createPersistence();

        await expect(
            mapCanonicalBridgeIdentities(persistence, SUBJECT),
        ).resolves.toEqual({
            canonicalUserId: USER_ID,
            firebaseUid: SUBJECT,
        });

        expect(persistence.transaction).toHaveBeenCalledOnce();
        expect(transaction.lockProviderAccountId).toHaveBeenCalledWith(SUBJECT);
        expect(transaction.createCanonicalUser).toHaveBeenCalledOnce();
        expect(records).toEqual([
            {
                provider: "appwrite",
                providerAccountId: SUBJECT,
                userId: USER_ID,
            },
            {
                provider: "firebase",
                providerAccountId: SUBJECT,
                userId: USER_ID,
            },
        ]);
        expect(transaction.markBridgeIdentitiesUsed).toHaveBeenCalledWith(
            SUBJECT,
        );
    });

    it.each(["appwrite", "firebase"] as const)(
        "attaches a missing identity to the existing %s canonical user",
        async (existingProvider) => {
            const { persistence, records, transaction } = createPersistence([
                {
                    provider: existingProvider,
                    providerAccountId: SUBJECT,
                    userId: USER_ID,
                },
            ]);

            await expect(
                mapCanonicalBridgeIdentities(persistence, SUBJECT),
            ).resolves.toEqual({
                canonicalUserId: USER_ID,
                firebaseUid: SUBJECT,
            });

            expect(transaction.createCanonicalUser).not.toHaveBeenCalled();
            expect(records).toHaveLength(2);
            expect(new Set(records.map((record) => record.userId))).toEqual(
                new Set([USER_ID]),
            );
        },
    );

    it("is idempotent when the identity pair already agrees", async () => {
        const initial = ["appwrite", "firebase"].map((provider) => ({
            provider: provider as "appwrite" | "firebase",
            providerAccountId: SUBJECT,
            userId: USER_ID,
        }));
        const { persistence, transaction } = createPersistence(initial);

        await mapCanonicalBridgeIdentities(persistence, SUBJECT);

        expect(transaction.createCanonicalUser).not.toHaveBeenCalled();
        expect(transaction.insertBridgeIdentity).not.toHaveBeenCalled();
        expect(transaction.markBridgeIdentitiesUsed).toHaveBeenCalledOnce();
    });

    it("fails closed before writing when existing identities collide", async () => {
        const { persistence, transaction } = createPersistence([
            {
                provider: "appwrite",
                providerAccountId: SUBJECT,
                userId: USER_ID,
            },
            {
                provider: "firebase",
                providerAccountId: SUBJECT,
                userId: "00000000-0000-4000-8000-000000000002",
            },
        ]);

        await expect(
            mapCanonicalBridgeIdentities(persistence, SUBJECT),
        ).rejects.toBeInstanceOf(CanonicalIdentityCollisionError);

        expect(transaction.createCanonicalUser).not.toHaveBeenCalled();
        expect(transaction.insertBridgeIdentity).not.toHaveBeenCalled();
        expect(transaction.markBridgeIdentitiesUsed).not.toHaveBeenCalled();
    });

    it("verifies the persisted pair and fails closed on a write anomaly", async () => {
        const { persistence, transaction } = createPersistence();
        vi.mocked(transaction.insertBridgeIdentity).mockResolvedValue(undefined);

        await expect(
            mapCanonicalBridgeIdentities(persistence, SUBJECT),
        ).rejects.toBeInstanceOf(CanonicalIdentityCollisionError);

        expect(transaction.markBridgeIdentitiesUsed).toHaveBeenCalledOnce();
    });
});
