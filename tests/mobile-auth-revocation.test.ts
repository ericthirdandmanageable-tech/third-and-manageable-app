import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { InvalidAppwriteIdentityError } from "@/lib/mobile-auth-bridge";
import {
    MAX_APPWRITE_WEBHOOK_BODY_BYTES,
    createAppwriteRevocationWebhookHandler,
    createFirebaseRevocationHandler,
    getAppwriteRevocationUserId,
    type AppwriteRevocationWebhookDependencies,
    type AppwriteWebhookConfiguration,
    type MobileAuthRevocationDependencies,
} from "@/lib/mobile-auth-revocation";

const VALID_JWT = "header.payload.signature";
const WEBHOOK_URL =
    "https://preview.example/api/mobile/auth/appwrite-webhook";
const WEBHOOK_SECRET = "test-signing-secret";

function createRevocationDependencies(): MobileAuthRevocationDependencies {
    return {
        verifyAppwriteJwt: vi.fn().mockResolvedValue({ id: "appwrite-user-1" }),
        revokeFirebaseRefreshTokens: vi.fn().mockResolvedValue(undefined),
        recordOutcome: vi.fn(),
    };
}

function createRevocationRequest(authorization?: string): Request {
    return new Request("https://preview.example/api/mobile/auth/revoke", {
        method: "POST",
        headers: authorization ? { authorization } : undefined,
    });
}

const WEBHOOK_CONFIGURATION: AppwriteWebhookConfiguration = {
    projectId: "staging-project",
    webhookId: "revocation-hook",
    webhookUrl: WEBHOOK_URL,
    webhookSecret: WEBHOOK_SECRET,
};

function createWebhookDependencies(): AppwriteRevocationWebhookDependencies {
    return {
        getConfiguration: vi.fn(() => WEBHOOK_CONFIGURATION),
        revokeFirebaseRefreshTokens: vi.fn().mockResolvedValue(undefined),
        recordOutcome: vi.fn(),
    };
}

function signWebhook(body: string, url = WEBHOOK_URL): string {
    return createHmac("sha1", WEBHOOK_SECRET)
        .update(url + body)
        .digest("base64");
}

function createWebhookRequest({
    body,
    event,
    signature = signWebhook(body),
    projectId = WEBHOOK_CONFIGURATION.projectId,
    webhookId = WEBHOOK_CONFIGURATION.webhookId,
    url = WEBHOOK_URL,
    contentLength,
}: {
    body: string;
    event: string;
    signature?: string;
    projectId?: string;
    webhookId?: string;
    url?: string;
    contentLength?: string;
}): Request {
    const headers: Record<string, string> = {
        "content-type": "application/json",
        "x-appwrite-webhook-events": event,
        "x-appwrite-webhook-id": webhookId,
        "x-appwrite-webhook-project-id": projectId,
        "x-appwrite-webhook-signature": signature,
    };
    if (contentLength !== undefined) headers["content-length"] = contentLength;

    return new Request(url, { method: "POST", headers, body });
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("authenticated Firebase session revocation", () => {
    it.each([
        undefined,
        "Basic abc123",
        "Bearer not-a-jwt",
        "Bearer header.payload.signature extra",
    ])("rejects missing or malformed Appwrite credentials", async (header) => {
        const dependencies = createRevocationDependencies();
        const response = await createFirebaseRevocationHandler(dependencies)(
            createRevocationRequest(header),
        );

        expect(response.status).toBe(401);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(response.headers.get("www-authenticate")).toBe("Bearer");
        expect(dependencies.verifyAppwriteJwt).not.toHaveBeenCalled();
        expect(dependencies.revokeFirebaseRefreshTokens).not.toHaveBeenCalled();
        expect(dependencies.recordOutcome).toHaveBeenCalledWith("rejected");
    });

    it("verifies the Appwrite JWT before revoking the matching Firebase UID", async () => {
        const dependencies = createRevocationDependencies();
        const response = await createFirebaseRevocationHandler(dependencies)(
            createRevocationRequest(`Bearer ${VALID_JWT}`),
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("no-store");
        await expect(response.json()).resolves.toEqual({ status: "revoked" });
        expect(dependencies.verifyAppwriteJwt).toHaveBeenCalledWith(VALID_JWT);
        expect(dependencies.revokeFirebaseRefreshTokens).toHaveBeenCalledWith(
            "appwrite-user-1",
        );
        expect(
            vi.mocked(dependencies.verifyAppwriteJwt).mock.invocationCallOrder[0],
        ).toBeLessThan(
            vi.mocked(dependencies.revokeFirebaseRefreshTokens).mock
                .invocationCallOrder[0],
        );
        expect(dependencies.recordOutcome).toHaveBeenCalledWith("succeeded");
    });

    it("maps an expired, disabled, or revoked Appwrite session to 401", async () => {
        const dependencies = createRevocationDependencies();
        vi.mocked(dependencies.verifyAppwriteJwt).mockRejectedValue(
            new InvalidAppwriteIdentityError(),
        );

        const response = await createFirebaseRevocationHandler(dependencies)(
            createRevocationRequest(`Bearer ${VALID_JWT}`),
        );

        expect(response.status).toBe(401);
        expect(dependencies.revokeFirebaseRefreshTokens).not.toHaveBeenCalled();
        expect(dependencies.recordOutcome).toHaveBeenCalledWith("rejected");
    });

    it("fails closed without logging provider details", async () => {
        const dependencies = createRevocationDependencies();
        const secretError = new Error(`Firebase rejected ${VALID_JWT}`);
        vi.mocked(dependencies.revokeFirebaseRefreshTokens).mockRejectedValue(
            secretError,
        );
        const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

        const response = await createFirebaseRevocationHandler(dependencies)(
            createRevocationRequest(`Bearer ${VALID_JWT}`),
        );

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toEqual({
            error: "Authentication revocation unavailable",
        });
        expect(log).toHaveBeenCalledWith(
            "Mobile authentication revocation provider failure",
        );
        expect(log).not.toHaveBeenCalledWith(secretError);
        expect(dependencies.recordOutcome).toHaveBeenCalledWith("unavailable");
    });
});

describe("signed Appwrite revocation webhook", () => {
    it.each([
        {
            event: "users.user-1.sessions.session-1.delete",
            body: JSON.stringify({ userId: "user-1", $id: "session-1" }),
        },
        {
            event: "users.*.sessions.*.delete",
            body: JSON.stringify({ userId: "user-1", $id: "session-1" }),
        },
        {
            event: "users.user-1.update.status",
            body: JSON.stringify({ $id: "user-1", status: false }),
        },
        {
            event: "users.*.update.status",
            body: JSON.stringify({ $id: "user-1", status: true }),
        },
    ])("accepts and revokes a supported $event event", async ({ event, body }) => {
        const dependencies = createWebhookDependencies();
        const response = await createAppwriteRevocationWebhookHandler(
            dependencies,
        )(createWebhookRequest({ body, event }));

        expect(response.status).toBe(204);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(dependencies.revokeFirebaseRefreshTokens).toHaveBeenCalledWith(
            "user-1",
        );
        expect(dependencies.recordOutcome).toHaveBeenCalledWith("succeeded");
    });

    it.each([
        { signature: "invalid", label: "signature" },
        { projectId: "production-project", label: "project" },
        { webhookId: "other-hook", label: "webhook" },
        {
            url: `${WEBHOOK_URL}?unexpected=1`,
            label: "configured URL",
        },
    ])("rejects a mismatched $label before revocation", async (override) => {
        const dependencies = createWebhookDependencies();
        const body = JSON.stringify({ userId: "user-1" });
        const response = await createAppwriteRevocationWebhookHandler(
            dependencies,
        )(
            createWebhookRequest({
                body,
                event: "users.*.sessions.*.delete",
                ...override,
            }),
        );

        expect(response.status).toBe(401);
        expect(response.headers.get("www-authenticate")).toBeNull();
        expect(dependencies.revokeFirebaseRefreshTokens).not.toHaveBeenCalled();
        expect(dependencies.recordOutcome).toHaveBeenCalledWith("rejected");
    });

    it.each([
        {
            event: "users.user-1.sessions.session-1.delete",
            body: JSON.stringify({ userId: "different-user" }),
        },
        {
            event: "users.user-1.update.status",
            body: JSON.stringify({ $id: "user-1", status: "false" }),
        },
        {
            event: "users.user-1.update.email",
            body: JSON.stringify({ $id: "user-1" }),
        },
        {
            event: "users.*.sessions.*.delete",
            body: "not-json",
        },
    ])("rejects an unsupported or inconsistent event payload", async ({
        event,
        body,
    }) => {
        const dependencies = createWebhookDependencies();
        const response = await createAppwriteRevocationWebhookHandler(
            dependencies,
        )(createWebhookRequest({ body, event }));

        expect(response.status).toBe(400);
        expect(dependencies.revokeFirebaseRefreshTokens).not.toHaveBeenCalled();
        expect(dependencies.recordOutcome).toHaveBeenCalledWith("rejected");
    });

    it("rejects oversized bodies before signature or provider work", async () => {
        const dependencies = createWebhookDependencies();
        const body = JSON.stringify({ userId: "user-1" });
        const response = await createAppwriteRevocationWebhookHandler(
            dependencies,
        )(
            createWebhookRequest({
                body,
                event: "users.*.sessions.*.delete",
                contentLength: String(MAX_APPWRITE_WEBHOOK_BODY_BYTES + 1),
            }),
        );

        expect(response.status).toBe(413);
        expect(dependencies.getConfiguration).not.toHaveBeenCalled();
        expect(dependencies.revokeFirebaseRefreshTokens).not.toHaveBeenCalled();
    });

    it("is safe to replay because Firebase refresh-token revocation is idempotent", async () => {
        const dependencies = createWebhookDependencies();
        const handler = createAppwriteRevocationWebhookHandler(dependencies);
        const body = JSON.stringify({ userId: "user-1", $id: "session-1" });

        const first = await handler(
            createWebhookRequest({
                body,
                event: "users.*.sessions.*.delete",
            }),
        );
        const second = await handler(
            createWebhookRequest({
                body,
                event: "users.*.sessions.*.delete",
            }),
        );

        expect(first.status).toBe(204);
        expect(second.status).toBe(204);
        expect(dependencies.revokeFirebaseRefreshTokens).toHaveBeenCalledTimes(2);
        expect(dependencies.revokeFirebaseRefreshTokens).toHaveBeenNthCalledWith(
            1,
            "user-1",
        );
        expect(dependencies.revokeFirebaseRefreshTokens).toHaveBeenNthCalledWith(
            2,
            "user-1",
        );
    });

    it("returns a generic 503 without logging payload or provider details", async () => {
        const dependencies = createWebhookDependencies();
        const secretError = new Error("provider response contained a token");
        vi.mocked(dependencies.revokeFirebaseRefreshTokens).mockRejectedValue(
            secretError,
        );
        const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const body = JSON.stringify({ userId: "user-1", secret: "do-not-log" });

        const response = await createAppwriteRevocationWebhookHandler(
            dependencies,
        )(
            createWebhookRequest({
                body,
                event: "users.*.sessions.*.delete",
            }),
        );

        expect(response.status).toBe(503);
        expect(log).toHaveBeenCalledWith(
            "Mobile authentication revocation webhook failure",
        );
        expect(log).not.toHaveBeenCalledWith(secretError);
        expect(log).not.toHaveBeenCalledWith(expect.stringContaining("do-not-log"));
        expect(dependencies.recordOutcome).toHaveBeenCalledWith("unavailable");
    });
});

describe("Appwrite revocation event parsing", () => {
    it("accepts concrete and wildcard forms only when they resolve to one user", () => {
        const body = JSON.stringify({
            $id: "user-1",
            userId: "user-1",
            status: false,
        });

        expect(
            getAppwriteRevocationUserId(
                "users.*.sessions.*.delete, users.user-1.update.status",
                body,
            ),
        ).toBe("user-1");
        expect(
            getAppwriteRevocationUserId(
                "users.user-2.sessions.session-1.delete, users.user-1.update.status",
                body,
            ),
        ).toBeNull();
    });
});
