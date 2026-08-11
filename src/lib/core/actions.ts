/*
 * WEEKLY ACTION REGISTRY — the fifteen categorized habits (§6.5).
 *
 * This is the single runtime source of truth after the Phase 2 Python cutover.
 * `tests/core-registry.test.ts` pins the taxonomy and its invariants.
 *
 * The admin's taxonomy won over the backend's old generic `a1`-`a4` because
 * the retained CWRU Firestore `completions` already use these keys — the pilot
 * data migrates cleanly and it was the backend that was the outlier.
 *
 * `category` is always the segment before the first hyphen, but read it
 * through `categoryForAction` rather than re-splitting the string at each call
 * site: an unknown id must be rejected, not silently invent a category.
 */

export const ACTION_CATEGORIES = [
    "career",
    "routine",
    "mindset",
    "social",
    "wellness",
] as const;

export type ActionCategory = (typeof ACTION_CATEGORIES)[number];

/** Display register, carried through from the redesign's action cards. */
export type ActionKind = "WORLD REP" | "SKILL REP" | "HABIT" | "REFLECTION";

export interface WeeklyAction {
    id: string;
    category: ActionCategory;
    kind: ActionKind;
    text: string;
}

export const WEEKLY_ACTIONS: WeeklyAction[] = [
    { id: "career-explore", category: "career", kind: "WORLD REP", text: "Career Exploration" },
    { id: "career-network", category: "career", kind: "WORLD REP", text: "Networking" },
    { id: "career-resume", category: "career", kind: "SKILL REP", text: "Resume & LinkedIn" },
    { id: "routine-morning", category: "routine", kind: "HABIT", text: "Morning Routine" },
    { id: "routine-exercise", category: "routine", kind: "HABIT", text: "Exercise" },
    { id: "routine-sleep", category: "routine", kind: "HABIT", text: "Sleep Hygiene" },
    { id: "mindset-journal", category: "mindset", kind: "REFLECTION", text: "Journaling" },
    { id: "mindset-gratitude", category: "mindset", kind: "REFLECTION", text: "Gratitude" },
    { id: "mindset-meditation", category: "mindset", kind: "REFLECTION", text: "Meditation" },
    { id: "social-connect", category: "social", kind: "WORLD REP", text: "Social Connection" },
    { id: "social-mentor", category: "social", kind: "WORLD REP", text: "Mentorship" },
    { id: "social-community", category: "social", kind: "WORLD REP", text: "Community" },
    { id: "wellness-therapy", category: "wellness", kind: "HABIT", text: "Therapy" },
    { id: "wellness-nutrition", category: "wellness", kind: "HABIT", text: "Nutrition" },
    { id: "wellness-hobby", category: "wellness", kind: "HABIT", text: "New Hobby" },
];

const ACTIONS_BY_ID = new Map(WEEKLY_ACTIONS.map((a) => [a.id, a]));

export const getAction = (actionId: string): WeeklyAction | undefined =>
    ACTIONS_BY_ID.get(actionId);

/** The action's category, or `null` if the id is not in the taxonomy. */
export const categoryForAction = (actionId: string): ActionCategory | null =>
    ACTIONS_BY_ID.get(actionId)?.category ?? null;
