import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { BRAND_TOKEN_SPEC } from "../constants/brand-token-spec";
import { getSchoolAppThemeSignal } from "../constants/app-theme";
import { contrastRatio, WCAG_AA_TEXT } from "../constants/contrast";

const TARGET_SCREENS = [
  "profile",
  "check-in",
  "community",
  "notifications",
  "perks",
];

describe("liquid glass design system", () => {
  it("keeps raw structural color literals out of migrated screens", () => {
    for (const screen of TARGET_SCREENS) {
      const source = readFileSync(`app/(tabs)/${screen}.tsx`, "utf8");
      assert.doesNotMatch(source, /#[\da-f]{3,8}\b|rgba?\(/i, screen);
    }
  });

  it("defines an authenticated-shell, light-only glass contract", () => {
    assert.equal(BRAND_TOKEN_SPEC.appearanceScope, "authenticated-shell");
    assert.equal(BRAND_TOKEN_SPEC.glass.colorScheme, "light");
    assert.equal(BRAND_TOKEN_SPEC.glass.supportsDark, false);
  });

  it("keeps every supported brand signal AA-readable on the glass base", () => {
    for (const institution of Object.values(BRAND_TOKEN_SPEC.institutions)) {
      const safeSignal = getSchoolAppThemeSignal(institution.primary);
      assert.ok(
        contrastRatio(safeSignal, BRAND_TOKEN_SPEC.glass.base) >= WCAG_AA_TEXT,
        institution.name,
      );
    }
  });

  it("uses static token surfaces for repeated glass list cells", () => {
    for (const screen of ["check-in", "community", "notifications", "perks"]) {
      const source = readFileSync(`app/(tabs)/${screen}.tsx`, "utf8");
      assert.match(source, /GlassListSurface/, screen);
    }
  });
});
