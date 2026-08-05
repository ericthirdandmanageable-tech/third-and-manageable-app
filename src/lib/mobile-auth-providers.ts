import { getAdminAuth } from "@/lib/firebase-admin";
import {
    FIREBASE_BRIDGE_CLAIMS,
    InvalidAppwriteIdentityError,
    type MobileAuthBridgeDependencies,
} from "@/lib/mobile-auth-bridge";
import { Account, AppwriteException, Client } from "node-appwrite";

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

async function createFirebaseCustomToken(
    uid: string,
    claims: Readonly<typeof FIREBASE_BRIDGE_CLAIMS>,
): Promise<string> {
    return getAdminAuth().createCustomToken(uid, { ...claims });
}

export const mobileAuthBridgeProviders: MobileAuthBridgeDependencies = {
    verifyAppwriteJwt,
    createFirebaseCustomToken,
};
