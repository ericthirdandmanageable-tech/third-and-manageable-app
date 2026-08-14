import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getDefaultAppTheme,
  getSchoolTheme,
  getSchoolAppThemeSignal,
  isSupportedInstitutionId,
  isAppTheme,
} from "../constants/app-theme";

describe("native app themes", () => {
  it("defaults verified supported schools to Campus Colors", () => {
    assert.equal(getDefaultAppTheme(true), "school");
    assert.equal(getDefaultAppTheme(false), "dusk");
  });

  for (const [institutionId, expectedKey] of [
    ["tm:cleveland-state", "cleveland-state"],
    ["tm:case-western-reserve", "cwru"],
    ["tm:bowling-green-state", "bgsu"],
  ]) {
    it(`recognizes ${institutionId}`, () => {
      assert.equal(getSchoolTheme(institutionId).key, expectedKey);
    });
  }

  it("never guesses a palette from a display name", () => {
    assert.equal(getSchoolTheme("Bowling Green State University").key, "tm");
    assert.equal(getSchoolTheme(null).key, "tm");
    assert.equal(isSupportedInstitutionId("tm:cleveland-state"), true);
    assert.equal(isSupportedInstitutionId("Cleveland State University"), false);
    assert.equal(isSupportedInstitutionId("toString"), false);
  });

  it("ports the web AA signal contrast solver", () => {
    const signal = getSchoolAppThemeSignal("#F04B0B");
    assert.equal(signal, "#c73e09");
  });

  it("rejects malformed persisted values", () => {
    assert.equal(isAppTheme("dusk"), true);
    assert.equal(isAppTheme("school"), true);
    assert.equal(isAppTheme("legacy"), true);
    assert.equal(isAppTheme("light"), false);
    assert.equal(isAppTheme(null), false);
  });
});
