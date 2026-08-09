import { getAdminAuth } from "@/lib/firebase-admin";
import { checkRateLimit } from "@vercel/firewall";
import { mapCanonicalBridgeIdentities } from "@/lib/canonical-identity-mapping";
import { createNeonCanonicalIdentityPersistence } from "@/lib/db/canonical-identity-persistence";
import {
    FIREBASE_BRIDGE_CLAIMS,
    InvalidAppwriteIdentityError,
    type MobileAuthBridgeDependencies,
    type MobileAuthBridgeOutcome,
    type MobileAuthBridgeStage,
    type MobileAuthBridgeStageOutcome,
} from "@/lib/mobile-auth-bridge";
import { Account, AppwriteException, Client } from "node-appwrite";

const canonicalIdentityPersistence =
    createNeonCanonicalIdentityPersistence();
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
    return mapCanonicalBridgeIdentities(
        canonicalIdentityPersistence,
        appwriteUserId,
    );
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
