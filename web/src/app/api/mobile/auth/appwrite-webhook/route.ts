import { createAppwriteRevocationWebhookHandler } from "@/lib/mobile-auth-revocation";
import { appwriteRevocationWebhookProviders } from "@/lib/mobile-auth-revocation-providers";

export const runtime = "nodejs";

export const POST = createAppwriteRevocationWebhookHandler(
    appwriteRevocationWebhookProviders,
);
