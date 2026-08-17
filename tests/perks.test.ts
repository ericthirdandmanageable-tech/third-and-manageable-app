import { describe, expect, it } from "vitest";

import { calculatePerkProgress, PERKS } from "@/lib/core/perks";

describe("production perk parity", () => {
    it("uses exact canonical counters for every production perk", () => {
        const statuses = calculatePerkProgress({
            streak: 7,
            completions: 10,
            checkins: 3,
            daysActive: 12,
        });

        expect(statuses).toHaveLength(PERKS.length);
        expect(statuses.find(({ perk }) => perk.id === "p4")?.unlocked).toBe(true);
        expect(statuses.find(({ perk }) => perk.id === "p5")?.unlocked).toBe(true);
        expect(statuses.find(({ perk }) => perk.id === "p6")).toMatchObject({
            currentValue: 3,
            progress: 30,
            unlocked: false,
        });
    });

    it("caps progress at one hundred percent", () => {
        const statuses = calculatePerkProgress({
            streak: 900,
            completions: 900,
            checkins: 900,
            daysActive: 900,
        });
        expect(statuses.every((status) => status.progress === 100 && status.unlocked)).toBe(true);
    });
});
