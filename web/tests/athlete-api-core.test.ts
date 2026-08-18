import { afterEach, describe, expect, it } from "vitest";

import { normalizeEmail } from "@/lib/athlete-api/identity";
import {
    CLIPBOARD_MODEL,
    fallbackReply,
    SAFETY_TEMPLATE,
    summarizeAdaptation,
} from "@/lib/athlete-api/clipboard-ai";
import { currentWeekMonday } from "@/lib/athlete-api/game-plan";
import { deriveSkillMap } from "@/lib/core/skills";
import { scorePathFit } from "@/lib/core/paths";
import { assertIsolatedIntegrationBoundary } from "@/lib/integration-environment";

const original = {
    VERCEL_ENV: process.env.VERCEL_ENV,
    INTEGRATION_ENVIRONMENT: process.env.INTEGRATION_ENVIRONMENT,
    APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
};

afterEach(() => {
    for (const [key, value] of Object.entries(original)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
});

describe("athlete API authentication", () => {
    it("normalizes email and accepts only isolated staging projects in Preview", () => {
        expect(normalizeEmail("  Athlete@Example.COM ")).toBe("athlete@example.com");
        process.env.VERCEL_ENV = "preview";
        process.env.INTEGRATION_ENVIRONMENT = "staging";
        process.env.APPWRITE_PROJECT_ID = "69906dfc003364b9847e";
        process.env.FIREBASE_PROJECT_ID = "third-and-manageable-staging";
        expect(() => assertIsolatedIntegrationBoundary()).not.toThrow();
        process.env.APPWRITE_PROJECT_ID = "69906e3f0020c208d8e7";
        expect(() => assertIsolatedIntegrationBoundary()).toThrow("isolated Appwrite");
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
