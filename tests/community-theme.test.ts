import { describe, expect, it } from "vitest";

import { getCommunityTheme } from "../src/lib/core/community-theme";

describe("community university theming", () => {
    it.each([
        ["Cleveland State University", "cleveland-state", "#006747"],
        ["CSU", "cleveland-state", "#006747"],
        ["Case Western Reserve University", "cwru", "#071b78"],
        ["CWRU", "cwru", "#071b78"],
        ["Bowling Green State University", "bgsu", "#f04b0b"],
        ["BGSU", "bgsu", "#f04b0b"],
    ])("maps %s to its proposal palette", (school, key, primary) => {
        const theme = getCommunityTheme(school);

        expect(theme.key).toBe(key);
        expect(theme.primary).toBe(primary);
    });

    it.each([undefined, null, "", "University without a configured palette"])(
        "uses the neutral T&M identity for %s",
        (school) => {
            const theme = getCommunityTheme(school);

            expect(theme.key).toBe("tm");
            expect(theme.communityName).toBe("Third & Manageable Community");
            expect(theme.initials).toBe("T&M");
        },
    );
});
