/*
 * Journey math — the 90-day arc is earned, not hardcoded. Pure helpers over
 * check-in dates (YYYY-MM-DD), shared by the UI and Route Handlers.
 */

export const TOTAL_DAYS = 90;

const MILLISECONDS_PER_DAY = 86_400_000;

/** Format the local calendar fields of a Date as YYYY-MM-DD. */
export const localDateISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
    ).padStart(2, "0")}`;

/**
 * Convert a date-only value to a timezone-free calendar ordinal.
 *
 * Date-only values are business data, not instants. Using local-midnight
 * timestamps makes a spring-forward day 23 hours and a fall-back day 25
 * hours. Date.UTC keeps the user's local calendar fields while making every
 * adjacent date exactly one ordinal apart.
 */
export const calendarDayOrdinal = (iso: string): number => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!match) throw new RangeError(`Invalid ISO calendar date: ${iso}`);

    const [, year, month, day] = match.map(Number);
    const timestamp = Date.UTC(year, month - 1, day);
    const normalized = new Date(timestamp);
    if (
        normalized.getUTCFullYear() !== year ||
        normalized.getUTCMonth() !== month - 1 ||
        normalized.getUTCDate() !== day
    ) {
        throw new RangeError(`Invalid ISO calendar date: ${iso}`);
    }
    return Math.floor(timestamp / MILLISECONDS_PER_DAY);
};

export const calendarDaysBetween = (startISO: string, endISO: string): number =>
    calendarDayOrdinal(endISO) - calendarDayOrdinal(startISO);

export const shiftCalendarDate = (iso: string, days: number): string => {
    const shifted = new Date(
        (calendarDayOrdinal(iso) + days) * MILLISECONDS_PER_DAY,
    );
    return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(
        2,
        "0",
    )}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
};

export const todayISO = () => localDateISO(new Date());

/** Day N = N days after the first check-in, clamped to the arc. No check-ins → Day 1. */
export const dayNumberFromDates = (
    dates: string[],
    today = todayISO(),
): number => {
    if (!dates.length) return 1;
    const first = dates.reduce((a, b) => (a < b ? a : b));
    const diff = calendarDaysBetween(first, today);
    return Math.min(diff + 1, TOTAL_DAYS);
};

/** Consecutive days with a check-in, counting back from today (yesterday counts while today is open). */
export const streakFromDates = (
    dates: string[],
    today = todayISO(),
): number => {
    const set = new Set(dates);
    let cursor = set.has(today) ? today : shiftCalendarDate(today, -1);
    let streak = 0;
    while (set.has(cursor)) {
        streak += 1;
        cursor = shiftCalendarDate(cursor, -1);
    }
    return streak;
};
