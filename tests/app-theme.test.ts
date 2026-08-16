import { describe, expect, it } from "vitest";

import {
    getDefaultAppTheme,
    isAppShellPath,
} from "../src/lib/core/app-theme";

describe("app theme scope", () => {
    it.each([
        "/",
        "/clipboard",
        "/community",
        "/community/forum/post",
        "/game-plan/path/example",
        "/onboarding",
        "/profile",
        "/progress",
        "/support",
    ])("recognizes themed athlete path %s", (pathname) => {
        expect(isAppShellPath(pathname)).toBe(true);
    });

    it.each([
        "/admin",
        "/admin/login",
        "/login",
        "/api/health",
        "/not-a-real-route",
    ])("does not leak athlete theming onto %s", (pathname) => {
        expect(isAppShellPath(pathname)).toBe(false);
    });
});

describe("smart app theme default", () => {
    it("uses Campus Colors only for a verified school match", () => {
        expect(getDefaultAppTheme(true)).toBe("school");
    });

    it("uses Sideline Dusk otherwise and never defaults to Legacy Neon", () => {
        expect(getDefaultAppTheme(false)).toBe("dusk");
    });
});
