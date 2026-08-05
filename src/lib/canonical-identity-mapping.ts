export const BRIDGE_IDENTITY_PROVIDERS = ["appwrite", "firebase"] as const;

export type BridgeIdentityProvider =
    (typeof BRIDGE_IDENTITY_PROVIDERS)[number];

export interface CanonicalIdentityRecord {
    provider: BridgeIdentityProvider;
    providerAccountId: string;
    userId: string;
}

export interface CanonicalIdentityTransaction {
    /** Serializes mapping attempts for this provider subject. */
    lockProviderAccountId(providerAccountId: string): Promise<void>;
    findBridgeIdentities(
        providerAccountId: string,
    ): Promise<readonly CanonicalIdentityRecord[]>;
    createCanonicalUser(): Promise<string>;
    insertBridgeIdentity(identity: CanonicalIdentityRecord): Promise<void>;
    markBridgeIdentitiesUsed(providerAccountId: string): Promise<void>;
}

export interface CanonicalIdentityPersistence {
    transaction<T>(
        operation: (transaction: CanonicalIdentityTransaction) => Promise<T>,
    ): Promise<T>;
}

export interface CanonicalIdentityMapping {
    canonicalUserId: string;
    firebaseUid: string;
}

/**
 * A deliberately generic error: provider subjects must not enter logs or
 * responses when two pre-existing identities disagree.
 */
export class CanonicalIdentityCollisionError extends Error {
    constructor() {
        super("Canonical identity mapping collision");
        this.name = "CanonicalIdentityCollisionError";
    }
}

function indexIdentityPair(
    records: readonly CanonicalIdentityRecord[],
    providerAccountId: string,
): Map<BridgeIdentityProvider, string> {
    const indexed = new Map<BridgeIdentityProvider, string>();

    for (const record of records) {
        if (
            !BRIDGE_IDENTITY_PROVIDERS.includes(record.provider) ||
            record.providerAccountId !== providerAccountId ||
            !record.userId ||
            indexed.has(record.provider)
        ) {
            throw new CanonicalIdentityCollisionError();
        }

        indexed.set(record.provider, record.userId);
    }

    if (new Set(indexed.values()).size > 1) {
        throw new CanonicalIdentityCollisionError();
    }

    return indexed;
}

/**
 * Maps the verified Appwrite subject and its temporary Firebase UID to exactly
 * one canonical user. Email is intentionally absent from this API: it is an
 * attribute, never an automatic account-linking key.
 */
export async function mapCanonicalBridgeIdentities(
    persistence: CanonicalIdentityPersistence,
    verifiedAppwriteUserId: string,
): Promise<CanonicalIdentityMapping> {
    return persistence.transaction(async (transaction) => {
        await transaction.lockProviderAccountId(verifiedAppwriteUserId);

        const before = indexIdentityPair(
            await transaction.findBridgeIdentities(verifiedAppwriteUserId),
            verifiedAppwriteUserId,
        );
        const canonicalUserId =
            before.values().next().value ??
            (await transaction.createCanonicalUser());

        for (const provider of BRIDGE_IDENTITY_PROVIDERS) {
            if (!before.has(provider)) {
                await transaction.insertBridgeIdentity({
                    provider,
                    providerAccountId: verifiedAppwriteUserId,
                    userId: canonicalUserId,
                });
            }
        }

        await transaction.markBridgeIdentitiesUsed(verifiedAppwriteUserId);

        const after = indexIdentityPair(
            await transaction.findBridgeIdentities(verifiedAppwriteUserId),
            verifiedAppwriteUserId,
        );
        if (
            after.size !== BRIDGE_IDENTITY_PROVIDERS.length ||
            [...after.values()].some((userId) => userId !== canonicalUserId)
        ) {
            throw new CanonicalIdentityCollisionError();
        }

        return {
            canonicalUserId,
            firebaseUid: verifiedAppwriteUserId,
        };
    });
}
