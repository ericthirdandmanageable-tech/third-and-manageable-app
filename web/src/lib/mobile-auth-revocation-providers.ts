import { getAdminAuth } from "@/lib/firebase-admin";
import { mobileAuthBridgeProviders } from "@/lib/mobile-auth-providers";
import type {
    AppwriteRevocationWebhookDependencies,
    AppwriteWebhookConfiguration,
    MobileAuthRevocationDependencies,
    MobileAuthRevocationOutcome,
} from "@/lib/mobile-auth-revocation";

function revokeFirebaseRefreshTokens(appwriteUserId: string): Promise<void> {
    return getAdminAuth().revokeRefreshTokens(appwriteUserId);
}

function recordOutcome(outcome: MobileAuthRevocationOutcome): void {
    console.info(
        JSON.stringify({
            event: "mobile_auth_firebase_revocation",
            outcome,
            bridgeVersion: 1,
        }),
    );
}

function getWebhookConfiguration(): AppwriteWebhookConfiguration {
    const projectId = process.env.APPWRITE_PROJECT_ID;
    const webhookId = process.env.APPWRITE_WEBHOOK_ID;
    const webhookUrl = process.env.APPWRITE_WEBHOOK_URL;
    const webhookSecret = process.env.APPWRITE_WEBHOOK_SECRET;

    if (!projectId || !webhookId || !webhookUrl || !webhookSecret) {
        throw new Error(
            "Appwrite revocation webhook is not configured; see env.example.",
        );
    }

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(webhookUrl);
    } catch {
        throw new Error("APPWRITE_WEBHOOK_URL is not a valid URL.");
    }
    if (parsedUrl.protocol !== "https:") {
        throw new Error("APPWRITE_WEBHOOK_URL must use HTTPS.");
    }
    if (webhookSecret.length < 8 || webhookSecret.length > 256) {
        throw new Error(
            "APPWRITE_WEBHOOK_SECRET must be between 8 and 256 characters.",
        );
    }

    return { projectId, webhookId, webhookUrl, webhookSecret };
}

export const mobileAuthRevocationProviders: MobileAuthRevocationDependencies = {
    verifyAppwriteJwt: mobileAuthBridgeProviders.verifyAppwriteJwt,
    revokeFirebaseRefreshTokens,
    recordOutcome,
};

export const appwriteRevocationWebhookProviders: AppwriteRevocationWebhookDependencies = {
    getConfiguration: getWebhookConfiguration,
    revokeFirebaseRefreshTokens,
    recordOutcome,
};
