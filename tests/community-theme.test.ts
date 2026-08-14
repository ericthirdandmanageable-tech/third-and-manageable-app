import { describe, expect, it } from "vitest";

import {
    APP_THEME_GLASS_BASE,
    getSchoolAppThemeSignal,
} from "../src/lib/core/app-theme";
import {
    contrastRatio,
    ensureTextContrast,
    WCAG_AA_TEXT,
    WCAG_AA_UI,
} from "../src/lib/core/contrast";
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

describe("community theme accessibility", () => {
    it("chooses the readable direction for a saturated mid-tone background", () => {
        const ink = ensureTextContrast("#ffffff", "#f04b0b", WCAG_AA_TEXT);

        expect(contrastRatio(ink, "#f04b0b")).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    });

    it.each(["Cleveland State University", "CWRU", "BGSU"])(
        "gives %s a primary-derived shell signal that reads as normal text on the glass base",
        (school) => {
            const theme = getCommunityTheme(school);
            const signal = getSchoolAppThemeSignal(theme.primary);

            expect(contrastRatio(signal, APP_THEME_GLASS_BASE)).toBeGreaterThanOrEqual(
                WCAG_AA_TEXT,
            );
            expect(contrastRatio(signal, "#ffffff")).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
        },
    );

    it.each(["Third & Manageable", "Cleveland State University", "CWRU", "BGSU"])(
        "gives %s a `text` color that meets WCAG AA (4.5:1) on the white community surface",
        (school) => {
            const theme = getCommunityTheme(school);

            expect(contrastRatio(theme.text, "#ffffff")).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
        },
    );

    it.each(["Third & Manageable", "Cleveland State University", "CWRU", "BGSU"])(
        "gives %s an `accentOnDark` that reads as text (4.5:1) across the hero gradient",
        (school) => {
            const theme = getCommunityTheme(school);

            expect(contrastRatio(theme.accentOnDark, theme.primaryDark)).toBeGreaterThanOrEqual(
                WCAG_AA_TEXT,
            );
            expect(contrastRatio(theme.accentOnDark, theme.text)).toBeGreaterThanOrEqual(
                WCAG_AA_TEXT,
            );
        },
    );

    it.each(["Third & Manageable", "Cleveland State University", "CWRU", "BGSU"])(
        "gives %s an `accent` that clears UI-component contrast (3:1) as an icon/border on the page surface",
        (school) => {
            const theme = getCommunityTheme(school);

            expect(contrastRatio(theme.accent, "#f6f7f9")).toBeGreaterThanOrEqual(WCAG_AA_UI);
        },
    );
});
