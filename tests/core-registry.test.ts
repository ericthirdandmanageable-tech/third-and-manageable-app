import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { ACTION_CATEGORIES, WEEKLY_ACTIONS, categoryForAction } from "../src/lib/core/actions";
import { FORUMS } from "../src/lib/core/community";
import { JOURNEY, JOURNEY_PHASES, getPhaseForDay } from "../src/lib/core/journey";
import { WORK_PATHS } from "../src/lib/core/paths";

/**
 * `lib/core` and the FastAPI bridge's `services/registry.py` hold the same
 * rules in two languages until Phase 2 retires the bridge. Nothing enforces
 * that but this file.
 *
 * Drift here is silent and expensive in both directions: an action id the
 * backend rejects makes a habit permanently untickable, and a path id only the
 * frontend knows about renders a Path Fit card that 404s. The prototype tried
 * to catch this with a dev-only `console.warn` at runtime — which nobody sees
 * in CI, and which only fires for a signed-in user with a reachable backend.
 */

const registry = readFileSync(
    path.resolve(__dirname, "../backend/app/services/registry.py"),
    "utf8",
);

/** Values of one `"key": "value"` pair, in source order, within a slice. */
const stringField = (source: string, key: string): string[] =>
    [...source.matchAll(new RegExp(`"${key}":\\s*"((?:[^"\\\\]|\\\\.)*)"`, "g"))].map((m) =>
        m[1].replace(/\\"/g, '"'),
    );

/** The text of a top-level `NAME = [ ... ]` list literal. */
const pyList = (name: string): string => {
    const start = registry.indexOf(`${name} = [`);
    expect(start, `${name} not found in registry.py`).toBeGreaterThan(-1);
    const end = registry.indexOf("\n]", start);
    return registry.slice(start, end);
};

describe("weekly actions mirror the backend registry", () => {
    const py = pyList("WEEKLY_ACTIONS");

    it("has the same ids in the same order", () => {
        expect(WEEKLY_ACTIONS.map((a) => a.id)).toEqual(stringField(py, "id"));
    });

    it("has the same categories, kinds, and labels", () => {
        expect(WEEKLY_ACTIONS.map((a) => a.category)).toEqual(stringField(py, "category"));
        expect(WEEKLY_ACTIONS.map((a) => a.kind)).toEqual(stringField(py, "kind"));
        expect(WEEKLY_ACTIONS.map((a) => a.text)).toEqual(stringField(py, "text"));
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
        // plausible-looking category — the backend writes this to every
        // `action_completions` row.
        expect(categoryForAction("career-invented")).toBeNull();
        expect(categoryForAction("")).toBeNull();
    });
});

describe("work paths mirror the backend registry", () => {
    const py = pyList("WORK_PATHS");

    it("has the same ids in the same order", () => {
        expect(WORK_PATHS.map((p) => p.id)).toEqual(stringField(py, "id"));
    });

    it("has the same names and fit ratings", () => {
        expect(WORK_PATHS.map((p) => p.name)).toEqual(stringField(py, "name"));
        expect(WORK_PATHS.map((p) => p.fit)).toEqual(stringField(py, "fit"));
    });

    it("gives every path exactly one derived forum", () => {
        for (const p of WORK_PATHS) {
            const forum = FORUMS.find((f) => f.id === `path-${p.id}`);
            expect(forum, `no forum for path ${p.id}`).toBeDefined();
            expect(forum?.pathId).toBe(p.id);
        }
    });
});

describe("journey phases mirror the backend registry", () => {
    it("has the same phase ids and names", () => {
        const py = pyList("JOURNEY_PHASES");
        expect(JOURNEY_PHASES.map((p) => p.id)).toEqual(stringField(py, "id"));
        expect(JOURNEY_PHASES.map((p) => p.name)).toEqual(stringField(py, "name"));
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
        expect(registry).toContain('JOURNEY = {"day": 1, "total_days": 90, "streak": 0}');
    });

    it("does not seed proposal mockup audience counts", () => {
        expect(FORUMS.every((forum) => forum.memberCount === 0)).toBe(true);
        expect(FORUMS.every((forum) => forum.activeNow === 0)).toBe(true);
        expect(registry).not.toMatch(/"member_count":\s*[1-9]/);
        expect(registry).not.toMatch(/"active_now":\s*[1-9]/);
    });
});
