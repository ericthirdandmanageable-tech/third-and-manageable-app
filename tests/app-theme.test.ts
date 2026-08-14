import { describe, expect, it } from "vitest";

import {
  getDefaultAppTheme,
  getSchoolTheme,
  isAppTheme,
} from "../constants/app-theme";

describe("native app themes", () => {
  it("defaults verified supported schools to Campus Colors", () => {
    expect(getDefaultAppTheme(true)).toBe("school");
    expect(getDefaultAppTheme(false)).toBe("dusk");
  });

  it.each([
    ["Cleveland State University", "cleveland-state"],
    ["CSU", "cleveland-state"],
    ["Case Western Reserve University", "cwru"],
    ["CWRU", "cwru"],
    ["Bowling Green State University", "bgsu"],
    ["BGSU", "bgsu"],
  ])("recognizes %s", (school, expectedKey) => {
    expect(getSchoolTheme(school).key).toBe(expectedKey);
  });

  it("does not guess a palette for unknown schools", () => {
    expect(getSchoolTheme("Other University").key).toBe("tm");
    expect(getSchoolTheme(null).key).toBe("tm");
  });

  it("rejects malformed persisted values", () => {
    expect(isAppTheme("dusk")).toBe(true);
    expect(isAppTheme("school")).toBe(true);
    expect(isAppTheme("legacy")).toBe(true);
    expect(isAppTheme("light")).toBe(false);
    expect(isAppTheme(null)).toBe(false);
  });
});

