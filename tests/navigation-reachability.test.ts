import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";

const source = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const routeFiles = [
  "app/(tabs)/profile.tsx",
  "app/(tabs)/notifications.tsx",
  "app/(tabs)/progress.tsx",
  "app/(tabs)/perks.tsx",
  "app/(tabs)/support.tsx",
  "app/(legal)/terms.tsx",
  "app/(legal)/privacy.tsx",
  "app/(tabs)/check-in.tsx",
  "app/(tabs)/clipboard.tsx",
  "app/(tabs)/community.tsx",
  "app/(tabs)/game-plan.tsx",
  "app/(tabs)/path-detail.tsx",
] as const;

describe("authenticated navigation reachability", () => {
  it("keeps every required destination registered as a route", () => {
    for (const routeFile of routeFiles) {
      assert.ok(source(routeFile).length > 0, `${routeFile} must exist`);
    }
  });

  it("keeps Profile permanent without replacing the five core tabs", () => {
    const home = source("app/(tabs)/index.tsx");
    const layout = source("app/(tabs)/_layout.tsx");

    assert.match(home, /accessibilityLabel="Profile and settings"/);
    assert.match(home, /router\.push\("\/\(tabs\)\/profile"\)/);
    assert.match(layout, /name="profile" options=\{\{ href: null, title: "Settings" \}\}/);
  });

  it("connects settings, account deletion, notifications, progress, perks, support, and legal", () => {
    const home = source("app/(tabs)/index.tsx");
    const profile = source("app/(tabs)/profile.tsx");

    assert.match(profile, /deleteAccount\(\)/);
    assert.match(home, /router\.push\("\/\(tabs\)\/notifications"\)/);
    assert.match(home, /router\.push\("\/\(tabs\)\/progress"\)/);
    assert.match(profile, /router\.push\("\/\(tabs\)\/perks"\)/);
    assert.match(profile, /router\.push\("\/\(tabs\)\/support"\)/);
    assert.match(profile, /router\.push\("\/\(legal\)\/terms"\)/);
    assert.match(profile, /router\.push\("\/\(legal\)\/privacy"\)/);
  });

  it("preserves check-in and Clipboard history navigation", () => {
    const checkIn = source("app/(tabs)/check-in.tsx");
    const clipboard = source("app/(tabs)/clipboard.tsx");

    assert.match(checkIn, /setHistoryMode\(true\)/);
    assert.match(checkIn, /getChatSessions/);
    assert.match(clipboard, /getSessionMessages/);
  });

  it("preserves community report, block, and support entry points", () => {
    const community = source("app/(tabs)/community.tsx");

    assert.match(community, /reportMessage\(/);
    assert.match(community, /blockUser\(/);
    assert.match(community, /createSupportRequest\(/);
    assert.match(community, /Report Message/);
    assert.match(community, /Block User/);
    assert.match(community, /Need Support/);
  });

  it("preserves career intake, path detail, commitment, and return navigation", () => {
    const plan = source("app/(tabs)/game-plan.tsx");
    const detail = source("app/(tabs)/path-detail.tsx");

    assert.match(plan, /<CareerIntakeModal/);
    assert.match(plan, /pathname: "\/\(tabs\)\/path-detail"/);
    assert.match(detail, /Commit to this path/);
    assert.match(detail, /router\.back\(\)/);
  });
});
