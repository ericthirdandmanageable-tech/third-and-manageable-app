import { describe, expect, it } from "vitest";

import { ADMIN_LOGIN_PATH, config } from "../src/proxy";

/**
 * The matcher is a regex, and getting it wrong fails silently in the direction
 * that matters: an admin route that no longer matches is served without the
 * gate, and nothing about the page looks different. The layout and Route
 * Handlers still check independently, but that is defence in depth — not a
 * reason to leave a hole here.
 */
const matches = (pathname: string) =>
    config.matcher.some((pattern) =>
        new RegExp(`^${pattern}$`).test(pathname),
    );

describe("proxy matcher", () => {
    it.each([
        "/admin",
        "/admin/users",
        "/admin/checkins",
        "/admin/community",
        "/admin/gameplans",
        "/admin/support",
        // Nested and not-yet-existing routes are gated the moment they appear.
        "/admin/users/abc123",
        "/admin/reports/weekly/2026",
    ])("gates %s", (pathname) => {
        expect(matches(pathname)).toBe(true);
    });

    it("does not gate the login page it redirects to", () => {
        // Gating this would be an infinite redirect.
        expect(matches(ADMIN_LOGIN_PATH)).toBe(false);
    });

    it("does not gate non-admin routes", () => {
        for (const pathname of ["/", "/api/login", "/api/logout", "/administrator"]) {
            expect(matches(pathname)).toBe(false);
        }
    });

    it("still gates a route whose name merely starts with login", () => {
        // The exclusion is `login` exactly, not a prefix — otherwise
        // `/admin/logins` would slip through unprotected.
        expect(matches("/admin/logins")).toBe(true);
        expect(matches("/admin/login-history")).toBe(true);
    });
});
