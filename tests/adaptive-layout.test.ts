import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  APP_CONTENT_MAX_WIDTH,
  getAdaptiveLayout,
} from "../constants/adaptive-layout";

describe("adaptive app layout", () => {
  it("keeps narrow foldable panes compact", () => {
    const layout = getAdaptiveLayout(344, 882);
    assert.equal(layout.compact, true);
    assert.equal(layout.medium, false);
    assert.equal(layout.gutter, 16);
  });

  it("treats an iPad split view as a medium layout", () => {
    const layout = getAdaptiveLayout(744, 1024);
    assert.equal(layout.compact, false);
    assert.equal(layout.medium, true);
    assert.equal(layout.expanded, false);
  });

  it("caps full-width iPad content at a readable measure", () => {
    const layout = getAdaptiveLayout(1366, 1024);
    assert.equal(layout.expanded, true);
    assert.equal(layout.contentFrame.maxWidth, APP_CONTENT_MAX_WIDTH);
    assert.equal(layout.contentFrame.alignSelf, "center");
  });
});
