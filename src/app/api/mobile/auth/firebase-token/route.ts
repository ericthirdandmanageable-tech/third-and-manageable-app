import { createFirebaseTokenHandler } from "@/lib/mobile-auth-bridge";
import { mobileAuthBridgeProviders } from "@/lib/mobile-auth-providers";

export const runtime = "nodejs";

export const POST = createFirebaseTokenHandler(mobileAuthBridgeProviders);
