/*
 * JOURNEY & WEEKLY ACTIONS REGISTRY — placeholder content (§9).
 * Journey phases mark the 90-day arc; weekly action templates are the
 * athlete's reps. The engine assembles a week from these templates;
 * adding one here extends the rotation.
 */

export interface JourneyPhase {
  id: string;
  name: string;
  startDay: number;
  endDay: number;
}

export const JOURNEY_PHASES: JourneyPhase[] = [
  { id: 'foundation', name: 'Foundation', startDay: 1, endDay: 30 },
  { id: 'exploration', name: 'Exploration', startDay: 31, endDay: 60 },
  { id: 'commitment', name: 'Commitment', startDay: 61, endDay: 90 },
];

export const getPhaseForDay = (day: number) =>
  JOURNEY_PHASES.find((p) => day >= p.startDay && day <= p.endDay) ?? JOURNEY_PHASES[0];

/* Placeholder journey state — in production derived from check-in history */
export const JOURNEY = {
  day: 14,
  totalDays: 90,
  streak: 14,
};

export type ActionKind = 'REFLECTION' | 'SKILL REP' | 'WORLD REP';

export interface WeeklyAction {
  id: string;
  kind: ActionKind;
  text: string;
  pathId?: string; // set when the action is themed to a committed path
}

export const WEEKLY_ACTIONS: WeeklyAction[] = [
  { id: 'a1', kind: 'REFLECTION', text: 'Write down 3 wins from this week' },
  { id: 'a2', kind: 'SKILL REP', text: 'Rewrite one resume bullet in civilian language' },
  { id: 'a3', kind: 'WORLD REP', text: "Message one former teammate who's working" },
  { id: 'a4', kind: 'SKILL REP', text: 'Read one path page — the day-in-the-life section' },
];
