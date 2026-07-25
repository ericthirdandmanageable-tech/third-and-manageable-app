/*
 * Journey math — the 90-day arc is earned, not hardcoded. Pure helpers over
 * check-in dates (YYYY-MM-DD), mirroring backend services/journey.py so the
 * offline experience derives the same numbers the backend would.
 */

export const TOTAL_DAYS = 90;

const toDate = (iso: string) => new Date(iso + 'T00:00:00');
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const todayISO = () => toISO(new Date());

/** Day N = N days after the first check-in, clamped to the arc. No check-ins → Day 1. */
export const dayNumberFromDates = (dates: string[]): number => {
  if (!dates.length) return 1;
  const first = toDate(dates.reduce((a, b) => (a < b ? a : b)));
  const diff = Math.floor((toDate(todayISO()).getTime() - first.getTime()) / 86_400_000);
  return Math.min(diff + 1, TOTAL_DAYS);
};

/** Consecutive days with a check-in, counting back from today (yesterday counts while today is open). */
export const streakFromDates = (dates: string[]): number => {
  const set = new Set(dates);
  const today = todayISO();
  let cursor = set.has(today) ? toDate(today) : new Date(toDate(today).getTime() - 86_400_000);
  let streak = 0;
  while (set.has(toISO(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return streak;
};
