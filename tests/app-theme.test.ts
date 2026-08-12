import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getDefaultAppTheme,
  getSchoolTheme,
  isAppTheme,
} from "../constants/app-theme";

describe("native app themes", () => {
  it("defaults verified supported schools to Campus Colors", () => {
    assert.equal(getDefaultAppTheme(true), "school");
    assert.equal(getDefaultAppTheme(false), "dusk");
  });

  for (const [school, expectedKey] of [
    ["Cleveland State University", "cleveland-state"],
    ["CSU", "cleveland-state"],
    ["Case Western Reserve University", "cwru"],
    ["CWRU", "cwru"],
    ["Bowling Green State University", "bgsu"],
    ["BGSU", "bgsu"],
  ]) {
    it(`recognizes ${school}`, () => {
      assert.equal(getSchoolTheme(school).key, expectedKey);
    });
  }

  it("does not guess a palette for unknown schools", () => {
    assert.equal(getSchoolTheme("Other University").key, "tm");
    assert.equal(getSchoolTheme(null).key, "tm");
  });

  it("rejects malformed persisted values", () => {
    assert.equal(isAppTheme("dusk"), true);
    assert.equal(isAppTheme("school"), true);
    assert.equal(isAppTheme("legacy"), true);
    assert.equal(isAppTheme("light"), false);
    assert.equal(isAppTheme(null), false);
  });
});
