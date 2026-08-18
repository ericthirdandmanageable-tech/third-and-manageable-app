import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("native HTTPS handoff pages", () => {
  it.each([
    ["oauth.html", "thirdandmanageableapp://oauth/"],
    ["recovery.html", "thirdandmanageableapp://reset-password"],
  ])("keeps %s local, bounded, and pointed at the native app", async (file, deepLink) => {
    const html = await readFile(new URL(`../public/${file}`, import.meta.url), "utf8");

    expect(html).toContain(deepLink);
    expect(html).toContain('params.get("userId")');
    expect(html).toContain('params.get("secret")');
    expect(html).toContain('name="referrer" content="no-referrer"');
    expect(html).not.toMatch(/fetch\(|XMLHttpRequest|localStorage|sessionStorage/);
  });
});
