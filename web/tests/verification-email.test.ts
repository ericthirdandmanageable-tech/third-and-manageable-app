import { afterEach, describe, expect, it, vi } from "vitest";

import {
    createVerificationToken,
    hashVerificationToken,
    isUniversityEmail,
    verificationAdminEmails,
    verificationEmailTransport,
} from "@/lib/verification-email";

describe("account verification email helpers", () => {
    afterEach(() => vi.unstubAllEnvs());

    it("accepts university domains and rejects lookalikes", () => {
        expect(isUniversityEmail("Athlete@UCLA.EDU")).toBe(true);
        expect(isUniversityEmail("athlete@sports.ucla.edu")).toBe(true);
        expect(isUniversityEmail("athlete@ucla.edu.example.com")).toBe(false);
        expect(isUniversityEmail("athlete@notedu.com")).toBe(false);
        expect(isUniversityEmail("athlete@edu")).toBe(false);
        expect(isUniversityEmail("athlete name@ucla.edu")).toBe(false);
        expect(isUniversityEmail("athlete@.edu")).toBe(false);
        expect(isUniversityEmail("missing-at-sign.edu")).toBe(false);
    });

    it("creates opaque tokens and stores deterministic hashes", () => {
        const first = createVerificationToken();
        const second = createVerificationToken();
        expect(first).toMatch(/^[A-Za-z0-9_-]{40,100}$/);
        expect(second).not.toBe(first);
        expect(hashVerificationToken(first)).toMatch(/^[a-f0-9]{64}$/);
        expect(hashVerificationToken(first)).toBe(hashVerificationToken(first));
        expect(hashVerificationToken(second)).not.toBe(hashVerificationToken(first));
    });

    it("fans out to unique configured admins and retains Lucas as the default", () => {
        expect(verificationAdminEmails(undefined)).toEqual(["lucas@lingiq.ai"]);
        expect(verificationAdminEmails(" , ; ")).toEqual(["lucas@lingiq.ai"]);
        expect(
            verificationAdminEmails(
                "Lucas@LingIQ.ai, admin@example.com; ADMIN@example.com ",
            ),
        ).toEqual(["lucas@lingiq.ai", "admin@example.com"]);
    });

    it("defaults to Resend and accepts Gmail SMTP only when selected", () => {
        expect(verificationEmailTransport(undefined)).toBe("resend");
        expect(verificationEmailTransport(" GMAIL_SMTP ")).toBe("gmail_smtp");
        expect(() => verificationEmailTransport("unknown")).toThrow(
            "Unsupported verification email transport",
        );
    });
});
