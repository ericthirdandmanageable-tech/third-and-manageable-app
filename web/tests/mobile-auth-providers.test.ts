import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const providerMocks = vi.hoisted(() => {
    class MockAppwriteException extends Error {
        code: number;

        constructor(message: string, code: number) {
            super(message);
            this.code = code;
        }
    }

    return {
        accountGet: vi.fn(),
        clients: [] as Array<{
            endpoint?: string;
            projectId?: string;
            jwt?: string;
        }>,
        checkRateLimit: vi.fn(),
        createCustomToken: vi.fn(),
        MockAppwriteException,
    };
});

vi.mock("@vercel/firewall", () => ({
    checkRateLimit: providerMocks.checkRateLimit,
}));

vi.mock("node-appwrite", () => {
    class Client {
        state: (typeof providerMocks.clients)[number] = {};

        constructor() {
            providerMocks.clients.push(this.state);
        }

        setEndpoint(endpoint: string) {
            this.state.endpoint = endpoint;
            return this;
        }

        setProject(projectId: string) {
            this.state.projectId = projectId;
            return this;
        }

        setJWT(jwt: string) {
            this.state.jwt = jwt;
            return this;
        }
    }

    class Account {
        get = providerMocks.accountGet;
    }

    return {
        Account,
        AppwriteException: providerMocks.MockAppwriteException,
        Client,
    };
});

vi.mock("@/lib/firebase-admin", () => ({
    getAdminAuth: () => ({
        createCustomToken: providerMocks.createCustomToken,
    }),
}));

import { InvalidAppwriteIdentityError } from "@/lib/mobile-auth-bridge";
import { mobileAuthBridgeProviders } from "@/lib/mobile-auth-providers";

describe("mobile authentication provider adapters", () => {
    beforeEach(() => {
        vi.stubEnv("APPWRITE_ENDPOINT", "https://fra.cloud.appwrite.io/v1");
        vi.stubEnv("APPWRITE_PROJECT_ID", "69906e3f0020c208d8e7");
        providerMocks.clients.length = 0;
        providerMocks.accountGet.mockReset();
        providerMocks.checkRateLimit.mockReset();
        providerMocks.createCustomToken.mockReset();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("uses a fresh JWT-scoped Appwrite client and Account.get per exchange", async () => {
        providerMocks.accountGet
            .mockResolvedValueOnce({ $id: "user-one", status: true })
            .mockResolvedValueOnce({ $id: "user-two", status: true });

        await expect(
            mobileAuthBridgeProviders.verifyAppwriteJwt("one.two.three"),
        ).resolves.toEqual({ id: "user-one" });
        await expect(
            mobileAuthBridgeProviders.verifyAppwriteJwt("four.five.six"),
        ).resolves.toEqual({ id: "user-two" });

        expect(providerMocks.accountGet).toHaveBeenCalledTimes(2);
        expect(providerMocks.clients).toEqual([
            {
                endpoint: "https://fra.cloud.appwrite.io/v1",
                projectId: "69906e3f0020c208d8e7",
                jwt: "one.two.three",
            },
            {
                endpoint: "https://fra.cloud.appwrite.io/v1",
                projectId: "69906e3f0020c208d8e7",
                jwt: "four.five.six",
            },
        ]);
    });

    it("rejects disabled users and Appwrite authentication failures", async () => {
        providerMocks.accountGet.mockResolvedValueOnce({
            $id: "disabled-user",
            status: false,
        });
        await expect(
            mobileAuthBridgeProviders.verifyAppwriteJwt("one.two.three"),
        ).rejects.toBeInstanceOf(InvalidAppwriteIdentityError);

        providerMocks.accountGet.mockRejectedValueOnce(
            new providerMocks.MockAppwriteException("expired", 401),
        );
        await expect(
            mobileAuthBridgeProviders.verifyAppwriteJwt("four.five.six"),
        ).rejects.toBeInstanceOf(InvalidAppwriteIdentityError);
    });

    it("does not disguise Appwrite availability errors as bad credentials", async () => {
        const outage = new providerMocks.MockAppwriteException("outage", 500);
        providerMocks.accountGet.mockRejectedValueOnce(outage);

        await expect(
            mobileAuthBridgeProviders.verifyAppwriteJwt("one.two.three"),
        ).rejects.toBe(outage);
    });

    it("fails closed when the Appwrite project configuration is absent", async () => {
        vi.stubEnv("APPWRITE_PROJECT_ID", "");

        await expect(
            mobileAuthBridgeProviders.verifyAppwriteJwt("one.two.three"),
        ).rejects.toThrow("Appwrite is not configured");
        expect(providerMocks.clients).toHaveLength(0);
    });

    it("passes the verified UID and minimal claims to Firebase Admin", async () => {
        providerMocks.createCustomToken.mockResolvedValue("custom-token");

        await expect(
            mobileAuthBridgeProviders.createFirebaseCustomToken("appwrite-user", {
                auth_source: "appwrite",
                bridge_version: 1,
            }),
        ).resolves.toBe("custom-token");
        expect(providerMocks.createCustomToken).toHaveBeenCalledWith(
            "appwrite-user",
            { auth_source: "appwrite", bridge_version: 1 },
        );
    });

    it("uses the verified Appwrite subject as the Firewall rate-limit key", async () => {
        const request = new Request(
            "https://preview.example/api/mobile/auth/firebase-token",
            { method: "POST" },
        );
        providerMocks.checkRateLimit.mockResolvedValue({ rateLimited: false });

        await expect(
            mobileAuthBridgeProviders.isRateLimited(request, "appwrite-user"),
        ).resolves.toBe(false);
        expect(providerMocks.checkRateLimit).toHaveBeenCalledWith(
            "mobile-auth-verified-user",
            {
                request,
                rateLimitKey: "appwrite-user",
            },
        );
    });

    it("returns a rate-limit decision and fails closed on Firewall errors", async () => {
        const request = new Request(
            "https://preview.example/api/mobile/auth/firebase-token",
            { method: "POST" },
        );
        providerMocks.checkRateLimit.mockResolvedValueOnce({
            rateLimited: true,
        });

        await expect(
            mobileAuthBridgeProviders.isRateLimited(request, "appwrite-user"),
        ).resolves.toBe(true);

        providerMocks.checkRateLimit.mockResolvedValueOnce({
            rateLimited: false,
            error: "not-found",
        });
        await expect(
            mobileAuthBridgeProviders.isRateLimited(request, "appwrite-user"),
        ).rejects.toThrow("Mobile authentication rate limit is unavailable");
    });

    it("records only fixed stage/outcome telemetry fields", () => {
        const log = vi.spyOn(console, "info").mockImplementation(() => undefined);

        mobileAuthBridgeProviders.recordStage("canonical_mapping", "failed");

        expect(log).toHaveBeenCalledOnce();
        expect(JSON.parse(vi.mocked(log).mock.calls[0][0])).toEqual({
            event: "mobile_auth_bridge_stage",
            stage: "canonical_mapping",
            outcome: "failed",
            bridgeVersion: 1,
        });
    });
});
