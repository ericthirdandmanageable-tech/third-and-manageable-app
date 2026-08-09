import { createHmac, timingSafeEqual } from "node:crypto";

import {
    APPWRITE_USER_ID_PATTERN,
    InvalidAppwriteIdentityError,
    extractAppwriteJwt,
} from "@/lib/mobile-auth-bridge";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
export const MAX_APPWRITE_WEBHOOK_BODY_BYTES = 64 * 1024;

export const MOBILE_AUTH_REVOCATION_OUTCOMES = [
    "succeeded",
    "rejected",
    "unavailable",
] as const;

export type MobileAuthRevocationOutcome =
    (typeof MOBILE_AUTH_REVOCATION_OUTCOMES)[number];

export interface MobileAuthRevocationDependencies {
    verifyAppwriteJwt(jwt: string): Promise<{ id: string }>;
    revokeFirebaseRefreshTokens(appwriteUserId: string): Promise<void>;
    recordOutcome(outcome: MobileAuthRevocationOutcome): void;
}

export interface AppwriteWebhookConfiguration {
    projectId: string;
    webhookId: string;
    webhookUrl: string;
    webhookSecret: string;
}

export interface AppwriteRevocationWebhookDependencies {
    getConfiguration(): AppwriteWebhookConfiguration;
    revokeFirebaseRefreshTokens(appwriteUserId: string): Promise<void>;
    recordOutcome(outcome: MobileAuthRevocationOutcome): void;
}

function recordOutcomeSafely(
    recordOutcome: (outcome: MobileAuthRevocationOutcome) => void,
    outcome: MobileAuthRevocationOutcome,
): void {
    try {
        recordOutcome(outcome);
    } catch {
        console.error("Mobile authentication revocation observability failure");
    }
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

function webhookUnauthorized(): Response {
    return Response.json(
        { error: "Invalid webhook signature" },
        { status: 401, headers: NO_STORE_HEADERS },
    );
}

export function createFirebaseRevocationHandler(
    dependencies: MobileAuthRevocationDependencies,
): (request: Request) => Promise<Response> {
    return async (request: Request) => {
        const jwt = extractAppwriteJwt(request);
        if (!jwt) {
            recordOutcomeSafely(dependencies.recordOutcome, "rejected");
            return unauthorized();
        }

        try {
            const user = await dependencies.verifyAppwriteJwt(jwt);
            if (!APPWRITE_USER_ID_PATTERN.test(user.id)) {
                throw new Error("Appwrite returned an invalid user ID");
            }

            await dependencies.revokeFirebaseRefreshTokens(user.id);
            recordOutcomeSafely(dependencies.recordOutcome, "succeeded");
            return Response.json(
                { status: "revoked" },
                { headers: NO_STORE_HEADERS },
            );
        } catch (error) {
            if (error instanceof InvalidAppwriteIdentityError) {
                recordOutcomeSafely(dependencies.recordOutcome, "rejected");
                return unauthorized();
            }

            console.error("Mobile authentication revocation provider failure");
            recordOutcomeSafely(dependencies.recordOutcome, "unavailable");
            return Response.json(
                { error: "Authentication revocation unavailable" },
                { status: 503, headers: NO_STORE_HEADERS },
            );
        }
    };
}

function signaturesMatch(expected: string, actual: string): boolean {
    const expectedBytes = Buffer.from(expected);
    const actualBytes = Buffer.from(actual);
    return (
        expectedBytes.length === actualBytes.length &&
        timingSafeEqual(expectedBytes, actualBytes)
    );
}

export function verifyAppwriteWebhookSignature(
    request: Request,
    rawBody: string,
    configuration: AppwriteWebhookConfiguration,
): boolean {
    if (
        request.url !== configuration.webhookUrl ||
        request.headers.get("x-appwrite-webhook-id") !==
            configuration.webhookId ||
        request.headers.get("x-appwrite-webhook-project-id") !==
            configuration.projectId
    ) {
        return false;
    }

    const suppliedSignature = request.headers.get(
        "x-appwrite-webhook-signature",
    );
    if (!suppliedSignature) return false;

    const expectedSignature = createHmac(
        "sha1",
        configuration.webhookSecret,
    )
        .update(configuration.webhookUrl + rawBody)
        .digest("base64");

    return signaturesMatch(expectedSignature, suppliedSignature);
}

const SESSION_DELETE_EVENT =
    /^users\.([A-Za-z0-9][A-Za-z0-9._-]{0,35})\.sessions\.[A-Za-z0-9][A-Za-z0-9._-]{0,35}\.delete$/;
const STATUS_UPDATE_EVENT =
    /^users\.([A-Za-z0-9][A-Za-z0-9._-]{0,35})\.update\.status$/;

function parsePayload(rawBody: string): Record<string, unknown> | null {
    try {
        const parsed: unknown = JSON.parse(rawBody);
        return parsed !== null &&
            typeof parsed === "object" &&
            !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : null;
    } catch {
        return null;
    }
}

export function getAppwriteRevocationUserId(
    eventsHeader: string | null,
    rawBody: string,
): string | null {
    if (!eventsHeader) return null;
    const payload = parsePayload(rawBody);
    if (!payload) return null;

    const supportedUserIds = new Set<string>();
    for (const event of eventsHeader.split(",").map((value) => value.trim())) {
        if (event === "users.*.sessions.*.delete") {
            if (
                typeof payload.userId !== "string" ||
                !APPWRITE_USER_ID_PATTERN.test(payload.userId)
            ) {
                return null;
            }
            supportedUserIds.add(payload.userId);
            continue;
        }

        if (event === "users.*.update.status") {
            if (
                typeof payload.$id !== "string" ||
                !APPWRITE_USER_ID_PATTERN.test(payload.$id) ||
                typeof payload.status !== "boolean"
            ) {
                return null;
            }
            supportedUserIds.add(payload.$id);
            continue;
        }

        const sessionMatch = SESSION_DELETE_EVENT.exec(event);
        if (sessionMatch) {
            if (payload.userId !== sessionMatch[1]) return null;
            supportedUserIds.add(sessionMatch[1]);
            continue;
        }

        const statusMatch = STATUS_UPDATE_EVENT.exec(event);
        if (statusMatch) {
            if (
                payload.$id !== statusMatch[1] ||
                typeof payload.status !== "boolean"
            ) {
                return null;
            }
            supportedUserIds.add(statusMatch[1]);
        }
    }

    return supportedUserIds.size === 1
        ? supportedUserIds.values().next().value ?? null
        : null;
}

export function createAppwriteRevocationWebhookHandler(
    dependencies: AppwriteRevocationWebhookDependencies,
): (request: Request) => Promise<Response> {
    return async (request: Request) => {
        try {
            const contentLength = Number(
                request.headers.get("content-length") ?? "0",
            );
            if (
                !Number.isFinite(contentLength) ||
                contentLength < 0 ||
                contentLength > MAX_APPWRITE_WEBHOOK_BODY_BYTES
            ) {
                recordOutcomeSafely(dependencies.recordOutcome, "rejected");
                return new Response(null, {
                    status: 413,
                    headers: NO_STORE_HEADERS,
                });
            }

            const rawBody = await request.text();
            if (
                Buffer.byteLength(rawBody, "utf8") >
                MAX_APPWRITE_WEBHOOK_BODY_BYTES
            ) {
                recordOutcomeSafely(dependencies.recordOutcome, "rejected");
                return new Response(null, {
                    status: 413,
                    headers: NO_STORE_HEADERS,
                });
            }

            const configuration = dependencies.getConfiguration();
            if (
                !verifyAppwriteWebhookSignature(
                    request,
                    rawBody,
                    configuration,
                )
            ) {
                recordOutcomeSafely(dependencies.recordOutcome, "rejected");
                return webhookUnauthorized();
            }

            const appwriteUserId = getAppwriteRevocationUserId(
                request.headers.get("x-appwrite-webhook-events"),
                rawBody,
            );
            if (!appwriteUserId) {
                recordOutcomeSafely(dependencies.recordOutcome, "rejected");
                return Response.json(
                    { error: "Unsupported webhook event" },
                    { status: 400, headers: NO_STORE_HEADERS },
                );
            }

            await dependencies.revokeFirebaseRefreshTokens(appwriteUserId);
            recordOutcomeSafely(dependencies.recordOutcome, "succeeded");
            return new Response(null, {
                status: 204,
                headers: NO_STORE_HEADERS,
            });
        } catch {
            console.error("Mobile authentication revocation webhook failure");
            recordOutcomeSafely(dependencies.recordOutcome, "unavailable");
            return Response.json(
                { error: "Authentication revocation unavailable" },
                { status: 503, headers: NO_STORE_HEADERS },
            );
        }
    };
}
