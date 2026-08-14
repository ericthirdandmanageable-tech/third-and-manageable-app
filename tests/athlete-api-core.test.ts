import { afterEach, describe, expect, it } from "vitest";

import {
    athleteApiConfig,
    createAccessToken,
    normalizeEmail,
    verifyAccessToken,
} from "@/lib/athlete-api/auth";
import {
    CLIPBOARD_MODEL,
    fallbackReply,
    SAFETY_TEMPLATE,
    summarizeAdaptation,
} from "@/lib/athlete-api/clipboard-ai";
import { currentWeekMonday } from "@/lib/athlete-api/game-plan";
import { deriveSkillMap } from "@/lib/core/skills";
import { scorePathFit } from "@/lib/core/paths";

const original = {
    JWT_SECRET: process.env.JWT_SECRET,
    AUTO_VERIFY: process.env.AUTO_VERIFY,
    VERCEL_ENV: process.env.VERCEL_ENV,
};

afterEach(() => {
    for (const [key, value] of Object.entries(original)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
});

describe("athlete API authentication", () => {
    it("normalizes email and signs canonical UUID/auth-version claims", () => {
        process.env.JWT_SECRET = "s".repeat(32);
        process.env.VERCEL_ENV = "development";
        expect(normalizeEmail("  Athlete@Example.COM ")).toBe("athlete@example.com");
        const token = createAccessToken({
            id: "0b7b3f0b-82fb-4d29-a8eb-6d4ed3a6fa50",
            authVersion: 7,
        });
        expect(verifyAccessToken(token)).toEqual({
            sub: "0b7b3f0b-82fb-4d29-a8eb-6d4ed3a6fa50",
            av: 7,
        });
        const replacement = token.endsWith("x") ? "y" : "x";
        expect(verifyAccessToken(`${token.slice(0, -1)}${replacement}`)).toBeNull();
    });

    it("fails closed for weak public configuration and production auto-verify", () => {
        process.env.VERCEL_ENV = "preview";
        process.env.JWT_SECRET = "weak";
        expect(() => athleteApiConfig()).toThrow("Unsafe");
        process.env.JWT_SECRET = "s".repeat(32);
        process.env.AUTO_VERIFY = "true";
        expect(() => athleteApiConfig()).toThrow("Unsafe");
    });
});

describe("ported deterministic behavior", () => {
    it("keeps ISO weeks scoped to their Monday across year boundaries", () => {
        expect(currentWeekMonday("2026-07-22")).toBe("2026-07-20");
        expect(currentWeekMonday("2026-07-20")).toBe("2026-07-20");
        expect(currentWeekMonday("2026-07-26")).toBe("2026-07-20");
        expect(currentWeekMonday("2025-07-23")).not.toBe(currentWeekMonday("2026-07-22"));
    });

    it("derives and ranks the same skill/path signals as the bridge", () => {
        const intake = {
            sport: "Soccer",
            role: "Captain / leader",
            years: "15+ years",
            relied_on: "Film study and helping every teammate understand our set plays",
            favorite: "The team",
        };
        const skills = deriveSkillMap(intake);
        expect(skills.map((entry) => entry.skill)).toContain("Captain");
        expect(scorePathFit(intake, skills)[0]).toMatchObject({
            id: "nine_to_five",
            fit: "STRONG FIT",
        });
    });
});

describe("Clipboard Gateway cutover", () => {
    it("uses a current Gateway model and preserves the crisis safety instruction", () => {
        expect(CLIPBOARD_MODEL).toBe("google/gemini-3.6-flash");
        expect(SAFETY_TEMPLATE).toContain("call 911 or call/text 988");
    });

    it("preserves invisible adaptation and deterministic offline options", () => {
        const history = [{ role: "user" as const, text: "hey" }];
        expect(summarizeAdaptation(history)).toContain("multiple-choice");
        expect(fallbackReply(history).options).toHaveLength(3);
        expect(summarizeAdaptation([{ role: "user", text: "x".repeat(140) }])).toContain("reflective");
    });
});
