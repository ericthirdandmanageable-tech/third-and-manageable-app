import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    ADMIN_SESSION_TTL_SECONDS,
    createAdminSessionToken,
    getAdminAuthConfigurationError,
    isAdminAuthConfigured,
    verifyAdminPassword,
    verifyAdminSessionToken,
} from "../src/lib/admin-session";

const PASSWORD = "correct horse battery staple";
const SESSION_SECRET =
    "f84f20705fba4c029f150675ae56ea3d54e1931303215c2e77aee779471c0d86";
const ISSUED_AT = 1_900_000_000;

describe("bootstrap admin authentication", () => {
    beforeEach(() => {
        vi.stubEnv("ADMIN_PASSWORD", PASSWORD);
        vi.stubEnv("ADMIN_SESSION_SECRET", SESSION_SECRET);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("fails configuration closed when either secret is absent or weak", () => {
        expect(isAdminAuthConfigured()).toBe(true);
        expect(getAdminAuthConfigurationError()).toBeNull();

        vi.stubEnv("ADMIN_PASSWORD", "");
        expect(isAdminAuthConfigured()).toBe(false);
        expect(verifyAdminPassword("")).toBe(false);

        vi.stubEnv("ADMIN_PASSWORD", PASSWORD);
        vi.stubEnv("ADMIN_SESSION_SECRET", "too-short");
        expect(isAdminAuthConfigured()).toBe(false);
        expect(verifyAdminSessionToken("anything")).toBe(false);
    });

    it("compares the configured password without accepting missing or wrong input", () => {
        expect(verifyAdminPassword(PASSWORD)).toBe(true);
        expect(verifyAdminPassword("wrong password value")).toBe(false);
        expect(verifyAdminPassword("")).toBe(false);
    });

    it("creates a signed, expiring token instead of the old constant value", () => {
        const token = createAdminSessionToken(ISSUED_AT);

        expect(token).not.toBe("authenticated");
        expect(token.split(".")).toHaveLength(2);
        expect(verifyAdminSessionToken(token, ISSUED_AT)).toBe(true);
        expect(
            verifyAdminSessionToken(
                token,
                ISSUED_AT + ADMIN_SESSION_TTL_SECONDS - 1,
            ),
        ).toBe(true);
        expect(
            verifyAdminSessionToken(
                token,
                ISSUED_AT + ADMIN_SESSION_TTL_SECONDS,
            ),
        ).toBe(false);
    });

    it("rejects forged, malformed, and secret-rotated tokens", () => {
        const token = createAdminSessionToken(ISSUED_AT);
        const [payload, signature] = token.split(".");

        expect(
            verifyAdminSessionToken(`${payload}x.${signature}`, ISSUED_AT),
        ).toBe(false);
        expect(
            verifyAdminSessionToken(`${payload}.${signature.slice(1)}x`, ISSUED_AT),
        ).toBe(false);
        expect(verifyAdminSessionToken("authenticated", ISSUED_AT)).toBe(false);
        expect(verifyAdminSessionToken("not.a.valid.token", ISSUED_AT)).toBe(false);
        expect(
            verifyAdminSessionToken(`${payload}.${signature}!`, ISSUED_AT),
        ).toBe(false);

        vi.stubEnv("ADMIN_SESSION_SECRET", `${SESSION_SECRET}rotated`);
        expect(verifyAdminSessionToken(token, ISSUED_AT)).toBe(false);

        vi.stubEnv("ADMIN_SESSION_SECRET", SESSION_SECRET);
        vi.stubEnv("ADMIN_PASSWORD", `${PASSWORD} rotated`);
        expect(verifyAdminSessionToken(token, ISSUED_AT)).toBe(false);
    });
});
