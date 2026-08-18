import { createFirebaseRevocationHandler } from "@/lib/mobile-auth-revocation";
import { mobileAuthRevocationProviders } from "@/lib/mobile-auth-revocation-providers";

export const runtime = "nodejs";

export const POST = createFirebaseRevocationHandler(
    mobileAuthRevocationProviders,
);
