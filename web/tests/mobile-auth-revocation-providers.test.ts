import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const providerMocks = vi.hoisted(() => ({
    revokeRefreshTokens: vi.fn(),
    verifyAppwriteJwt: vi.fn(),
}));

vi.mock("@/lib/firebase-admin", () => ({
    getAdminAuth: () => ({
        revokeRefreshTokens: providerMocks.revokeRefreshTokens,
    }),
}));

vi.mock("@/lib/mobile-auth-providers", () => ({
    mobileAuthBridgeProviders: {
        verifyAppwriteJwt: providerMocks.verifyAppwriteJwt,
    },
}));

import {
    appwriteRevocationWebhookProviders,
    mobileAuthRevocationProviders,
} from "@/lib/mobile-auth-revocation-providers";

describe("mobile authentication revocation provider adapters", () => {
    beforeEach(() => {
        vi.stubEnv("APPWRITE_PROJECT_ID", "staging-project");
        vi.stubEnv("APPWRITE_WEBHOOK_ID", "revocation-hook");
        vi.stubEnv(
            "APPWRITE_WEBHOOK_URL",
            "https://preview.example/api/mobile/auth/appwrite-webhook",
        );
        vi.stubEnv("APPWRITE_WEBHOOK_SECRET", "test-signing-secret");
        providerMocks.revokeRefreshTokens.mockReset();
        providerMocks.verifyAppwriteJwt.mockReset();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    it("reuses JWT verification and revokes the matching Firebase UID", async () => {
        providerMocks.verifyAppwriteJwt.mockResolvedValue({ id: "user-1" });

        await expect(
            mobileAuthRevocationProviders.verifyAppwriteJwt("one.two.three"),
        ).resolves.toEqual({ id: "user-1" });
        await mobileAuthRevocationProviders.revokeFirebaseRefreshTokens(
            "user-1",
        );

        expect(providerMocks.verifyAppwriteJwt).toHaveBeenCalledWith(
            "one.two.three",
        );
        expect(providerMocks.revokeRefreshTokens).toHaveBeenCalledWith("user-1");
    });

    it("loads a complete HTTPS webhook configuration", () => {
        expect(appwriteRevocationWebhookProviders.getConfiguration()).toEqual({
            projectId: "staging-project",
            webhookId: "revocation-hook",
            webhookUrl:
                "https://preview.example/api/mobile/auth/appwrite-webhook",
            webhookSecret: "test-signing-secret",
        });
    });

    it.each([
        "APPWRITE_PROJECT_ID",
        "APPWRITE_WEBHOOK_ID",
        "APPWRITE_WEBHOOK_URL",
        "APPWRITE_WEBHOOK_SECRET",
    ])("fails closed when %s is missing", (name) => {
        vi.stubEnv(name, "");

        expect(() =>
            appwriteRevocationWebhookProviders.getConfiguration(),
        ).toThrow("Appwrite revocation webhook is not configured");
    });

    it("requires an HTTPS URL and an Appwrite-sized signing secret", () => {
        vi.stubEnv("APPWRITE_WEBHOOK_URL", "http://preview.example/webhook");
        expect(() =>
            appwriteRevocationWebhookProviders.getConfiguration(),
        ).toThrow("must use HTTPS");

        vi.stubEnv(
            "APPWRITE_WEBHOOK_URL",
            "https://preview.example/api/mobile/auth/appwrite-webhook",
        );
        vi.stubEnv("APPWRITE_WEBHOOK_SECRET", "short");
        expect(() =>
            appwriteRevocationWebhookProviders.getConfiguration(),
        ).toThrow("between 8 and 256 characters");
    });

    it("records only aggregate revocation telemetry", () => {
        const log = vi.spyOn(console, "info").mockImplementation(() => undefined);

        mobileAuthRevocationProviders.recordOutcome("succeeded");

        expect(log).toHaveBeenCalledOnce();
        expect(JSON.parse(vi.mocked(log).mock.calls[0][0])).toEqual({
            event: "mobile_auth_firebase_revocation",
            outcome: "succeeded",
            bridgeVersion: 1,
        });
    });
});
