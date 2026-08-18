import { describe, expect, it } from "vitest";

import { findUniversities } from "../src/lib/core/university-search";
import { US_UNIVERSITIES } from "../src/lib/core/us-universities";

describe("University Finder search", () => {
    it("ships a broad local directory of active U.S. degree-granting institutions", () => {
        expect(US_UNIVERSITIES.length).toBeGreaterThan(3_500);
        expect(US_UNIVERSITIES.some(([, name]) => name === "Case Western Reserve University"))
            .toBe(true);
        expect(US_UNIVERSITIES.some(([, name]) => name === "University of Hawaii at Manoa"))
            .toBe(true);
    });

    it("prioritizes name-prefix matches from the first characters typed", () => {
        expect(findUniversities(US_UNIVERSITIES, "Case West")[0][1]).toBe(
            "Case Western Reserve University",
        );
    });

    it("supports familiar university acronyms", () => {
        expect(findUniversities(US_UNIVERSITIES, "UCLA").map(([, name]) => name)).toContain(
            "University of California-Los Angeles",
        );
    });

    it("puts a main campus ahead of its branches", () => {
        expect(findUniversities(US_UNIVERSITIES, "Bowling Gr")[0][1]).toBe(
            "Bowling Green State University-Main Campus",
        );
    });

    it("returns no suggestions for an empty query", () => {
        expect(findUniversities(US_UNIVERSITIES, "   ")).toEqual([]);
    });
});
