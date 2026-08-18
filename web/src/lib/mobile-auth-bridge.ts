export const MAX_APPWRITE_JWT_LENGTH = 4096;

export const FIREBASE_BRIDGE_CLAIMS = Object.freeze({
    auth_source: "appwrite",
    bridge_version: 1,
});

export const MOBILE_AUTH_BRIDGE_OUTCOMES = [
    "succeeded",
    "rejected",
    "rate_limited",
    "unavailable",
] as const;

export type MobileAuthBridgeOutcome =
    (typeof MOBILE_AUTH_BRIDGE_OUTCOMES)[number];

export const MOBILE_AUTH_BRIDGE_STAGES = [
    "verify_appwrite",
    "rate_limit",
    "canonical_mapping",
    "firebase_token",
] as const;

export type MobileAuthBridgeStage =
    (typeof MOBILE_AUTH_BRIDGE_STAGES)[number];

export const MOBILE_AUTH_BRIDGE_STAGE_OUTCOMES = ["succeeded", "failed"] as const;

export type MobileAuthBridgeStageOutcome =
    (typeof MOBILE_AUTH_BRIDGE_STAGE_OUTCOMES)[number];

const APPWRITE_JWT_PATTERN =
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
export const APPWRITE_USER_ID_PATTERN =
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/;
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export class InvalidAppwriteIdentityError extends Error {
    constructor() {
        super("The Appwrite identity could not be verified");
        this.name = "InvalidAppwriteIdentityError";
    }
}

export interface MobileAuthBridgeDependencies {
    verifyAppwriteJwt(jwt: string): Promise<{ id: string }>;
    isRateLimited(
        request: Request,
        verifiedAppwriteUserId: string,
    ): Promise<boolean>;
    mapCanonicalIdentities(appwriteUserId: string): Promise<{
        canonicalUserId: string;
        firebaseUid: string;
    }>;
    createFirebaseCustomToken(
        uid: string,
        claims: Readonly<typeof FIREBASE_BRIDGE_CLAIMS>,
    ): Promise<string>;
    recordStage(
        stage: MobileAuthBridgeStage,
        outcome: MobileAuthBridgeStageOutcome,
    ): void;
    recordOutcome(outcome: MobileAuthBridgeOutcome): void;
}

function unauthorized(): Response {
    return Response.json(
        { error: "Invalid credentials" },
        {
            status: 401,
            headers: {
                ...NO_STORE_HEADERS,
                "WWW-Authenticate": "Bearer",
            },
        },
    );
}

function rateLimited(): Response {
    return Response.json(
        { error: "Too many token exchange requests" },
        {
            status: 429,
            headers: {
                ...NO_STORE_HEADERS,
                "Retry-After": "60",
            },
        },
    );
}

export function extractAppwriteJwt(request: Request): string | null {
    const authorization = request.headers.get("authorization");
    if (!authorization) return null;

    const match = /^Bearer ([^\s]+)$/i.exec(authorization);
    if (!match) return null;

    const jwt = match[1];
    if (
        jwt.length > MAX_APPWRITE_JWT_LENGTH ||
        !APPWRITE_JWT_PATTERN.test(jwt)
    ) {
        return null;
    }

    return jwt;
}

export function createFirebaseTokenHandler(
    dependencies: MobileAuthBridgeDependencies,
): (request: Request) => Promise<Response> {
    function recordSafely(record: () => void): void {
        try {
            record();
        } catch {
            // Telemetry must not change an authentication decision. Do not log
            // sink errors because they can contain provider/request context.
        }
    }

    function respond(
        outcome: MobileAuthBridgeOutcome,
        response: Response,
    ): Response {
        recordSafely(() => dependencies.recordOutcome(outcome));

        return response;
    }

    return async (request: Request) => {
        const jwt = extractAppwriteJwt(request);
        if (!jwt) return respond("rejected", unauthorized());

        let stage: MobileAuthBridgeStage = "verify_appwrite";

        try {
            const user = await dependencies.verifyAppwriteJwt(jwt);
            if (!APPWRITE_USER_ID_PATTERN.test(user.id)) {
                throw new Error("Appwrite returned an invalid user ID");
            }
            recordSafely(() => dependencies.recordStage(stage, "succeeded"));

            stage = "rate_limit";
            if (await dependencies.isRateLimited(request, user.id)) {
                recordSafely(() => dependencies.recordStage(stage, "succeeded"));
                return respond("rate_limited", rateLimited());
            }
            recordSafely(() => dependencies.recordStage(stage, "succeeded"));

            stage = "canonical_mapping";
            const identityMapping =
                await dependencies.mapCanonicalIdentities(user.id);
            if (identityMapping.firebaseUid !== user.id) {
                throw new Error("Canonical identity mapping returned a mismatched UID");
            }
            recordSafely(() => dependencies.recordStage(stage, "succeeded"));

            stage = "firebase_token";
            const firebaseCustomToken =
                await dependencies.createFirebaseCustomToken(
                    identityMapping.firebaseUid,
                    FIREBASE_BRIDGE_CLAIMS,
                );

            if (!firebaseCustomToken) {
                throw new Error("Firebase returned an empty custom token");
            }
            recordSafely(() => dependencies.recordStage(stage, "succeeded"));

            return respond(
                "succeeded",
                Response.json(
                    { firebaseCustomToken },
                    { headers: NO_STORE_HEADERS },
                ),
            );
        } catch (error) {
            recordSafely(() => dependencies.recordStage(stage, "failed"));

            if (error instanceof InvalidAppwriteIdentityError) {
                return respond("rejected", unauthorized());
            }

            return respond(
                "unavailable",
                Response.json(
                    { error: "Authentication bridge unavailable" },
                    { status: 503, headers: NO_STORE_HEADERS },
                ),
            );
        }
    };
}
