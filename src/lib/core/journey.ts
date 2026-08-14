/*
 * JOURNEY REGISTRY — the 90-day arc.
 *
 * This is the single runtime source of truth after the Phase 2 Python cutover.
 * Weekly actions used to live here as `WEEKLY_ACTIONS`
 * (`a1`-`a4`) — they were superseded by the fifteen categorized habits and
 * now live in `./actions`, per VERCEL_MIGRATION_PLAN.md §6.5.
 */

export interface JourneyPhase {
    id: string;
    name: string;
    startDay: number;
    endDay: number;
}

export const JOURNEY_PHASES: JourneyPhase[] = [
    { id: "foundation", name: "Foundation", startDay: 1, endDay: 30 },
    { id: "exploration", name: "Exploration", startDay: 31, endDay: 60 },
    { id: "commitment", name: "Commitment", startDay: 61, endDay: 90 },
];

export const getPhaseForDay = (day: number) =>
    JOURNEY_PHASES.find((p) => day >= p.startDay && day <= p.endDay) ??
    JOURNEY_PHASES[0];

/* Honest pre-history state; authenticated values are derived from check-ins. */
export const JOURNEY = {
    day: 1,
    totalDays: 90,
    streak: 0,
};
