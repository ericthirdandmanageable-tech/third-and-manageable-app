import { getAdminAuth } from "@/lib/firebase-admin";
import { checkRateLimit } from "@vercel/firewall";
import { ensureProductProfile, isoNow } from "@/lib/firestore-product";
import { getAdminFirestore } from "@/lib/firebase-admin";
import {
    FIREBASE_BRIDGE_CLAIMS,
    InvalidAppwriteIdentityError,
    type MobileAuthBridgeDependencies,
    type MobileAuthBridgeOutcome,
    type MobileAuthBridgeStage,
    type MobileAuthBridgeStageOutcome,
} from "@/lib/mobile-auth-bridge";
import { Account, AppwriteException, Client } from "node-appwrite";

const MOBILE_AUTH_USER_RATE_LIMIT_ID = "mobile-auth-verified-user";

function getAppwriteConfiguration(): { endpoint: string; projectId: string } {
    const endpoint = process.env.APPWRITE_ENDPOINT;
    const projectId = process.env.APPWRITE_PROJECT_ID;

    if (!endpoint || !projectId) {
        throw new Error(
            "Appwrite is not configured: set APPWRITE_ENDPOINT and APPWRITE_PROJECT_ID (see env.example).",
        );
    }

    return { endpoint, projectId };
}

async function verifyAppwriteJwt(jwt: string): Promise<{ id: string }> {
    const { endpoint, projectId } = getAppwriteConfiguration();
    const client = new Client()
        .setEndpoint(endpoint)
        .setProject(projectId)
        .setJWT(jwt);

    try {
        const user = await new Account(client).get();
        if (!user.status) throw new InvalidAppwriteIdentityError();

        return { id: user.$id };
    } catch (error) {
        if (
            error instanceof InvalidAppwriteIdentityError ||
            (error instanceof AppwriteException &&
                (error.code === 401 || error.code === 403))
        ) {
            throw new InvalidAppwriteIdentityError();
        }

        throw error;
    }
}

async function isRateLimited(
    request: Request,
    verifiedAppwriteUserId: string,
): Promise<boolean> {
    const result = await checkRateLimit(MOBILE_AUTH_USER_RATE_LIMIT_ID, {
        request,
        // The SDK hashes this value with the rule ID before sending it to the
        // Firewall rate-limit endpoint. It is never logged by this application.
        rateLimitKey: verifiedAppwriteUserId,
    });

    if (result.error) {
        throw new Error("Mobile authentication rate limit is unavailable");
    }

    return result.rateLimited;
}

async function createFirebaseCustomToken(
    uid: string,
    claims: Readonly<typeof FIREBASE_BRIDGE_CLAIMS>,
): Promise<string> {
    return getAdminAuth().createCustomToken(uid, { ...claims });
}

async function mapCanonicalIdentities(appwriteUserId: string) {
    // Appwrite IDs are the universal owner ID across the staging stack. Keep a
    // small reconciliation record so bridge activity remains inspectable
    // without introducing a second canonical user identifier.
    await Promise.all([
        ensureProductProfile({ userId: appwriteUserId }),
        getAdminFirestore()
            .collection("auth_identity_mappings")
            .doc(appwriteUserId)
            .set(
                {
                    canonical_user_id: appwriteUserId,
                    appwrite_user_id: appwriteUserId,
                    firebase_uid: appwriteUserId,
                    updated_at: isoNow(),
                },
                { merge: true },
            ),
    ]);
    return {
        canonicalUserId: appwriteUserId,
        firebaseUid: appwriteUserId,
    };
}

function recordOutcome(outcome: MobileAuthBridgeOutcome): void {
    console.info(
        JSON.stringify({
            event: "mobile_auth_bridge_exchange",
            outcome,
            bridgeVersion: FIREBASE_BRIDGE_CLAIMS.bridge_version,
        }),
    );
}

function recordStage(
    stage: MobileAuthBridgeStage,
    outcome: MobileAuthBridgeStageOutcome,
): void {
    console.info(
        JSON.stringify({
            event: "mobile_auth_bridge_stage",
            stage,
            outcome,
            bridgeVersion: FIREBASE_BRIDGE_CLAIMS.bridge_version,
        }),
    );
}

export const mobileAuthBridgeProviders: MobileAuthBridgeDependencies = {
    verifyAppwriteJwt,
    isRateLimited,
    mapCanonicalIdentities,
    createFirebaseCustomToken,
    recordStage,
    recordOutcome,
};
