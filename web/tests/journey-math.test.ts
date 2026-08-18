import { describe, expect, it } from "vitest";

import { getPromptForDate } from "../src/lib/core/checkin";
import {
    calendarDayOrdinal,
    calendarDaysBetween,
    dayNumberFromDates,
    shiftCalendarDate,
    streakFromDates,
} from "../src/lib/core/journey-math";

describe("date-only journey math", () => {
    it("counts spring-forward dates as adjacent calendar days", () => {
        expect(calendarDaysBetween("2026-03-08", "2026-03-09")).toBe(1);
        expect(dayNumberFromDates(["2026-03-08"], "2026-03-09")).toBe(2);
        expect(
            streakFromDates(
                ["2026-03-07", "2026-03-08", "2026-03-09"],
                "2026-03-09",
            ),
        ).toBe(3);
    });

    it("counts fall-back dates as adjacent calendar days", () => {
        expect(calendarDaysBetween("2026-11-01", "2026-11-02")).toBe(1);
        expect(shiftCalendarDate("2026-11-02", -1)).toBe("2026-11-01");
    });

    it("lets yesterday carry the streak while today is still open", () => {
        expect(
            streakFromDates(["2026-03-07", "2026-03-08"], "2026-03-09"),
        ).toBe(2);
    });

    it("handles leap days and rejects impossible calendar dates", () => {
        expect(calendarDaysBetween("2024-02-28", "2024-03-01")).toBe(2);
        expect(shiftCalendarDate("2024-02-28", 1)).toBe("2024-02-29");
        expect(() => calendarDayOrdinal("2026-02-29")).toThrow(RangeError);
        expect(() => calendarDayOrdinal("03/08/2026")).toThrow(RangeError);
    });

    it("rotates prompts once per local calendar day across DST", () => {
        const before = getPromptForDate(new Date(2026, 2, 8, 12));
        const after = getPromptForDate(new Date(2026, 2, 9, 12));
        const promptCount = 5;
        expect((Number(after.id.slice(1)) - Number(before.id.slice(1)) + promptCount) % promptCount)
            .toBe(1);
    });
});
