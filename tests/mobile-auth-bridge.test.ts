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
        createFirebaseCustomToken: vi
            .fn()
            .mockResolvedValue("firebase-custom-token"),
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
        expect(dependencies.createFirebaseCustomToken).not.toHaveBeenCalled();
    });

    it("rejects an oversized JWT before calling a provider", async () => {
        const dependencies = createDependencies();
        const oversizedJwt = `a.${"b".repeat(MAX_APPWRITE_JWT_LENGTH)}.c`;
        const response = await createFirebaseTokenHandler(dependencies)(
            createRequest(`Bearer ${oversizedJwt}`),
        );

        expect(response.status).toBe(401);
        expect(dependencies.verifyAppwriteJwt).not.toHaveBeenCalled();
    });

    it("derives the Firebase UID only from the verified Appwrite response", async () => {
        const dependencies = createDependencies();
        const response = await createFirebaseTokenHandler(dependencies)(
            createRequest(`bearer ${VALID_JWT}`),
        );

        expect(dependencies.verifyAppwriteJwt).toHaveBeenCalledOnce();
        expect(dependencies.verifyAppwriteJwt).toHaveBeenCalledWith(VALID_JWT);
        expect(dependencies.createFirebaseCustomToken).toHaveBeenCalledOnce();
        expect(dependencies.createFirebaseCustomToken).toHaveBeenCalledWith(
            "appwrite-user-1",
            FIREBASE_BRIDGE_CLAIMS,
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("no-store");
        await expect(response.json()).resolves.toEqual({
            firebaseCustomToken: "firebase-custom-token",
        });
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
    });

    it("fails closed when Appwrite returns a malformed user ID", async () => {
        const dependencies = createDependencies();
        vi.mocked(dependencies.verifyAppwriteJwt).mockResolvedValue({
            id: "../client-supplied-or-invalid",
        });
        const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

        const response = await createFirebaseTokenHandler(dependencies)(
            createRequest(`Bearer ${VALID_JWT}`),
        );

        expect(response.status).toBe(503);
        expect(dependencies.createFirebaseCustomToken).not.toHaveBeenCalled();
        expect(log).toHaveBeenCalledWith(
            "Mobile authentication bridge provider failure",
        );
    });

    it("returns a generic no-store 503 without logging provider details", async () => {
        const dependencies = createDependencies();
        const secretBearingError = new Error(`provider rejected ${VALID_JWT}`);
        vi.mocked(dependencies.createFirebaseCustomToken).mockRejectedValue(
            secretBearingError,
        );
        const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

        const response = await createFirebaseTokenHandler(dependencies)(
            createRequest(`Bearer ${VALID_JWT}`),
        );

        expect(response.status).toBe(503);
        expect(response.headers.get("cache-control")).toBe("no-store");
        await expect(response.json()).resolves.toEqual({
            error: "Authentication bridge unavailable",
        });
        expect(log).toHaveBeenCalledWith(
            "Mobile authentication bridge provider failure",
        );
        expect(log).not.toHaveBeenCalledWith(secretBearingError);
    });

    it("fails closed if Firebase returns an empty token", async () => {
        const dependencies = createDependencies();
        vi.mocked(dependencies.createFirebaseCustomToken).mockResolvedValue("");
        vi.spyOn(console, "error").mockImplementation(() => undefined);

        const response = await createFirebaseTokenHandler(dependencies)(
            createRequest(`Bearer ${VALID_JWT}`),
        );

        expect(response.status).toBe(503);
    });
});
