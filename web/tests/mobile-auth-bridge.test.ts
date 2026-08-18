import { afterEach, describe, expect, it, vi } from "vitest";
import {
    FIREBASE_BRIDGE_CLAIMS,
    InvalidAppwriteIdentityError,
    MAX_APPWRITE_JWT_LENGTH,
    createFirebaseTokenHandler,
    type MobileAuthBridgeDependencies,
} from "@/lib/mobile-auth-bridge";

const VALID_JWT = "header.payload.signature";

function createDependencies(): MobileAuthBridgeDependencies {
    return {
        verifyAppwriteJwt: vi.fn().mockResolvedValue({ id: "appwrite-user-1" }),
        isRateLimited: vi.fn().mockResolvedValue(false),
        mapCanonicalIdentities: vi.fn().mockResolvedValue({
            canonicalUserId: "00000000-0000-4000-8000-000000000001",
            firebaseUid: "appwrite-user-1",
        }),
        createFirebaseCustomToken: vi
            .fn()
            .mockResolvedValue("firebase-custom-token"),
        recordStage: vi.fn(),
        recordOutcome: vi.fn(),
    };
}

function createRequest(authorization?: string): Request {
    const headers = authorization ? { authorization } : undefined;
    return new Request("http://localhost/api/mobile/auth/firebase-token", {
        method: "POST",
        headers,
    });
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("mobile Appwrite-to-Firebase token bridge", () => {
    it.each([
        undefined,
        "Basic abc123",
        "Bearer",
        "Bearer not-a-jwt",
        "Bearer header.payload.signature extra",
        "Bearer header.payload.signature,other",
    ])("rejects a missing or malformed authorization header", async (header) => {
        const dependencies = createDependencies();
        const response = await createFirebaseTokenHandler(dependencies)(
            createRequest(header),
        );

        expect(response.status).toBe(401);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(response.headers.get("www-authenticate")).toBe("Bearer");
        await expect(response.json()).resolves.toEqual({
            error: "Invalid credentials",
        });
        expect(dependencies.verifyAppwriteJwt).not.toHaveBeenCalled();
        expect(dependencies.isRateLimited).not.toHaveBeenCalled();
        expect(dependencies.mapCanonicalIdentities).not.toHaveBeenCalled();
        expect(dependencies.createFirebaseCustomToken).not.toHaveBeenCalled();
        expect(dependencies.recordOutcome).toHaveBeenCalledWith("rejected");
    });

    it("rejects an oversized JWT before calling a provider", async () => {
        const dependencies = createDependencies();
        const oversizedJwt = `a.${"b".repeat(MAX_APPWRITE_JWT_LENGTH)}.c`;
        const response = await createFirebaseTokenHandler(dependencies)(
            createRequest(`Bearer ${oversizedJwt}`),
        );

        expect(response.status).toBe(401);
        expect(dependencies.verifyAppwriteJwt).not.toHaveBeenCalled();
        expect(dependencies.isRateLimited).not.toHaveBeenCalled();
        expect(dependencies.mapCanonicalIdentities).not.toHaveBeenCalled();
        expect(dependencies.recordOutcome).toHaveBeenCalledWith("rejected");
    });

    it("derives the Firebase UID only from the verified Appwrite response", async () => {
        const dependencies = createDependencies();
        const response = await createFirebaseTokenHandler(dependencies)(
            createRequest(`bearer ${VALID_JWT}`),
        );

        expect(dependencies.verifyAppwriteJwt).toHaveBeenCalledOnce();
        expect(dependencies.verifyAppwriteJwt).toHaveBeenCalledWith(VALID_JWT);
        expect(dependencies.mapCanonicalIdentities).toHaveBeenCalledOnce();
        expect(dependencies.mapCanonicalIdentities).toHaveBeenCalledWith(
            "appwrite-user-1",
        );
        expect(dependencies.createFirebaseCustomToken).toHaveBeenCalledOnce();
        expect(dependencies.createFirebaseCustomToken).toHaveBeenCalledWith(
            "appwrite-user-1",
            FIREBASE_BRIDGE_CLAIMS,
        );
        expect(response.status).toBe(200);
        expect(
            vi.mocked(dependencies.verifyAppwriteJwt).mock.invocationCallOrder[0],
        ).toBeLessThan(
            vi.mocked(dependencies.isRateLimited).mock.invocationCallOrder[0],
        );
        expect(
            vi.mocked(dependencies.isRateLimited).mock.invocationCallOrder[0],
        ).toBeLessThan(
            vi.mocked(dependencies.mapCanonicalIdentities).mock
                .invocationCallOrder[0],
        );
        expect(
            vi.mocked(dependencies.mapCanonicalIdentities).mock
                .invocationCallOrder[0],
        ).toBeLessThan(
            vi.mocked(dependencies.createFirebaseCustomToken).mock
                .invocationCallOrder[0],
        );
        expect(response.headers.get("cache-control")).toBe("no-store");
        await expect(response.json()).resolves.toEqual({
            firebaseCustomToken: "firebase-custom-token",
        });
        expect(dependencies.recordStage).toHaveBeenNthCalledWith(
            1,
            "verify_appwrite",
            "succeeded",
        );
        expect(dependencies.recordStage).toHaveBeenNthCalledWith(
            2,
            "rate_limit",
            "succeeded",
        );
        expect(dependencies.recordStage).toHaveBeenNthCalledWith(
            3,
            "canonical_mapping",
            "succeeded",
        );
        expect(dependencies.recordStage).toHaveBeenNthCalledWith(
            4,
            "firebase_token",
            "succeeded",
        );
        expect(dependencies.recordOutcome).toHaveBeenCalledWith("succeeded");
    });

    it("maps an invalid, expired, or disabled Appwrite identity to 401", async () => {
        const dependencies = createDependencies();
        vi.mocked(dependencies.verifyAppwriteJwt).mockRejectedValue(
            new InvalidAppwriteIdentityError(),
        );

        const response = await createFirebaseTokenHandler(dependencies)(
            createRequest(`Bearer ${VALID_JWT}`),
        );

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toEqual({
            error: "Invalid credentials",
        });
        expect(dependencies.createFirebaseCustomToken).not.toHaveBeenCalled();
        expect(dependencies.isRateLimited).not.toHaveBeenCalled();
        expect(dependencies.recordStage).toHaveBeenCalledWith(
            "verify_appwrite",
            "failed",
        );
        expect(dependencies.recordOutcome).toHaveBeenCalledWith("rejected");
    });

    it("fails closed when Appwrite returns a malformed user ID", async () => {
        const dependencies = createDependencies();
        vi.mocked(dependencies.verifyAppwriteJwt).mockResolvedValue({
            id: "../client-supplied-or-invalid",
        });
        const response = await createFirebaseTokenHandler(dependencies)(
            createRequest(`Bearer ${VALID_JWT}`),
        );

        expect(response.status).toBe(503);
        expect(dependencies.isRateLimited).not.toHaveBeenCalled();
        expect(dependencies.mapCanonicalIdentities).not.toHaveBeenCalled();
        expect(dependencies.createFirebaseCustomToken).not.toHaveBeenCalled();
        expect(dependencies.recordStage).toHaveBeenCalledWith(
            "verify_appwrite",
            "failed",
        );
        expect(dependencies.recordOutcome).toHaveBeenCalledWith("unavailable");
    });

    it("rate-limits only after Appwrite verification and before database or Firebase work", async () => {
        const dependencies = createDependencies();
        vi.mocked(dependencies.isRateLimited).mockResolvedValue(true);

        const response = await createFirebaseTokenHandler(dependencies)(
            createRequest(`Bearer ${VALID_JWT}`),
        );

        expect(response.status).toBe(429);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(response.headers.get("retry-after")).toBe("60");
        await expect(response.json()).resolves.toEqual({
            error: "Too many token exchange requests",
        });
        expect(dependencies.verifyAppwriteJwt).toHaveBeenCalledOnce();
        expect(dependencies.isRateLimited).toHaveBeenCalledWith(
            expect.any(Request),
            "appwrite-user-1",
        );
        expect(dependencies.mapCanonicalIdentities).not.toHaveBeenCalled();
        expect(dependencies.createFirebaseCustomToken).not.toHaveBeenCalled();
        expect(dependencies.recordStage).toHaveBeenCalledWith(
            "rate_limit",
            "succeeded",
        );
        expect(dependencies.recordOutcome).toHaveBeenCalledWith("rate_limited");
    });

    it("fails closed when canonical identity mapping fails", async () => {
        const dependencies = createDependencies();
        vi.mocked(dependencies.mapCanonicalIdentities).mockRejectedValue(
            new Error("identity collision with sensitive provider subjects"),
        );
        const response = await createFirebaseTokenHandler(dependencies)(
            createRequest(`Bearer ${VALID_JWT}`),
        );

        expect(response.status).toBe(503);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(dependencies.createFirebaseCustomToken).not.toHaveBeenCalled();
        expect(dependencies.recordStage).toHaveBeenCalledWith(
            "canonical_mapping",
            "failed",
        );
        expect(dependencies.recordOutcome).toHaveBeenCalledWith("unavailable");
    });

    it("fails closed when identity mapping changes the Firebase UID", async () => {
        const dependencies = createDependencies();
        vi.mocked(dependencies.mapCanonicalIdentities).mockResolvedValue({
            canonicalUserId: "00000000-0000-4000-8000-000000000001",
            firebaseUid: "different-user",
        });
        const response = await createFirebaseTokenHandler(dependencies)(
            createRequest(`Bearer ${VALID_JWT}`),
        );

        expect(response.status).toBe(503);
        expect(dependencies.createFirebaseCustomToken).not.toHaveBeenCalled();
        expect(dependencies.recordStage).toHaveBeenCalledWith(
            "canonical_mapping",
            "failed",
        );
        expect(dependencies.recordOutcome).toHaveBeenCalledWith("unavailable");
    });

    it("returns a generic no-store 503 without logging provider details", async () => {
        const dependencies = createDependencies();
        const secretBearingError = new Error(`provider rejected ${VALID_JWT}`);
        vi.mocked(dependencies.createFirebaseCustomToken).mockRejectedValue(
            secretBearingError,
        );
        const response = await createFirebaseTokenHandler(dependencies)(
            createRequest(`Bearer ${VALID_JWT}`),
        );

        expect(response.status).toBe(503);
        expect(response.headers.get("cache-control")).toBe("no-store");
        await expect(response.json()).resolves.toEqual({
            error: "Authentication bridge unavailable",
        });
        expect(dependencies.recordStage).toHaveBeenCalledWith(
            "firebase_token",
            "failed",
        );
        expect(dependencies.recordOutcome).toHaveBeenCalledWith("unavailable");
    });

    it("fails closed if Firebase returns an empty token", async () => {
        const dependencies = createDependencies();
        vi.mocked(dependencies.createFirebaseCustomToken).mockResolvedValue("");
        const response = await createFirebaseTokenHandler(dependencies)(
            createRequest(`Bearer ${VALID_JWT}`),
        );

        expect(response.status).toBe(503);
        expect(dependencies.recordStage).toHaveBeenCalledWith(
            "firebase_token",
            "failed",
        );
        expect(dependencies.recordOutcome).toHaveBeenCalledWith("unavailable");
    });

    it("does not let an observability failure change a successful exchange", async () => {
        const dependencies = createDependencies();
        vi.mocked(dependencies.recordOutcome).mockImplementation(() => {
            throw new Error("telemetry sink unavailable");
        });
        const response = await createFirebaseTokenHandler(dependencies)(
            createRequest(`Bearer ${VALID_JWT}`),
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            firebaseCustomToken: "firebase-custom-token",
        });
    });
});
