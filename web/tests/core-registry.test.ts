import { describe, expect, it } from "vitest";

import { ACTION_CATEGORIES, WEEKLY_ACTIONS, categoryForAction } from "../src/lib/core/actions";
import { FORUMS } from "../src/lib/core/community";
import { JOURNEY, JOURNEY_PHASES, getPhaseForDay } from "../src/lib/core/journey";
import { WORK_PATHS } from "../src/lib/core/paths";

describe("weekly action registry", () => {
    it("contains the fifteen retained pilot-data ids in stable order", () => {
        expect(WEEKLY_ACTIONS.map((a) => a.id)).toEqual([
            "career-explore", "career-network", "career-resume",
            "routine-morning", "routine-exercise", "routine-sleep",
            "mindset-journal", "mindset-gratitude", "mindset-meditation",
            "social-connect", "social-mentor", "social-community",
            "wellness-therapy", "wellness-nutrition", "wellness-hobby",
        ]);
    });

    it("declares every category it uses", () => {
        for (const action of WEEKLY_ACTIONS) {
            expect(ACTION_CATEGORIES).toContain(action.category);
        }
    });

    it("derives the category from the id prefix without trusting the prefix", () => {
        for (const action of WEEKLY_ACTIONS) {
            expect(categoryForAction(action.id)).toBe(action.category);
            expect(action.id.startsWith(`${action.category}-`)).toBe(true);
        }
        // An id outside the taxonomy must be rejected, not split into a
        // plausible-looking category — the API writes this to every
        // `action_completions` row.
        expect(categoryForAction("career-invented")).toBeNull();
        expect(categoryForAction("")).toBeNull();
    });
});

describe("work path registry", () => {
    it("keeps stable ids and complete path detail metadata", () => {
        expect(WORK_PATHS.map((p) => p.id)).toEqual([
            "consulting", "nine_to_five", "entrepreneurship", "gig", "overnight",
        ]);
        for (const path of WORK_PATHS) {
            expect(path.name).toBeTruthy();
            expect(path.rationale).toBeTruthy();
            expect(path.firstReps).toHaveLength(3);
        }
    });

    it("gives every path exactly one derived forum", () => {
        for (const p of WORK_PATHS) {
            const forum = FORUMS.find((f) => f.id === `path-${p.id}`);
            expect(forum, `no forum for path ${p.id}`).toBeDefined();
            expect(forum?.pathId).toBe(p.id);
        }
    });
});

describe("journey phases", () => {
    it("keeps the three stable phase ids", () => {
        expect(JOURNEY_PHASES.map((p) => p.id)).toEqual([
            "foundation", "exploration", "commitment",
        ]);
    });

    it("covers the whole arc with no gaps or overlaps", () => {
        expect(JOURNEY_PHASES[0].startDay).toBe(1);
        expect(JOURNEY_PHASES.at(-1)?.endDay).toBe(JOURNEY.totalDays);
        JOURNEY_PHASES.slice(1).forEach((phase, i) => {
            expect(phase.startDay).toBe(JOURNEY_PHASES[i].endDay + 1);
        });
    });

    it("resolves every day of the arc, and clamps outside it", () => {
        for (let day = 1; day <= JOURNEY.totalDays; day++) {
            const phase = getPhaseForDay(day);
            expect(day).toBeGreaterThanOrEqual(phase.startDay);
            expect(day).toBeLessThanOrEqual(phase.endDay);
        }
        // Day 0 and day 91 are unreachable through the UI, but a bad clamp
        // upstream must not crash a page — it falls back to the first phase.
        expect(getPhaseForDay(0)).toBe(JOURNEY_PHASES[0]);
        expect(getPhaseForDay(JOURNEY.totalDays + 1)).toBe(JOURNEY_PHASES[0]);
    });
});

describe("fresh-system registry defaults", () => {
    it("starts the journey at day one with no earned streak", () => {
        expect(JOURNEY).toEqual({ day: 1, totalDays: 90, streak: 0 });
    });

    it("does not seed proposal mockup audience counts", () => {
        expect(FORUMS.every((forum) => forum.memberCount === 0)).toBe(true);
        expect(FORUMS.every((forum) => forum.activeNow === 0)).toBe(true);
    });
});
