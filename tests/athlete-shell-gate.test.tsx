// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ShellLayout from "../src/app/(athlete)/(shell)/layout";
import { api, type ApiGamePlan } from "../src/lib/athlete/api";
import { useAuth } from "../src/lib/athlete/auth";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
    usePathname: () => "/community",
    useRouter: () => ({ push: vi.fn(), replace }),
}));

vi.mock("next/link", () => ({
    default: ({
        href,
        children,
        ...props
    }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

vi.mock("../src/lib/athlete/auth", () => ({
    useAuth: vi.fn(),
}));

const plan = (intakeDone: boolean): ApiGamePlan => ({
    intake_done: intakeDone,
    skill_map: [],
    path_fit: [],
    committed_path_id: null,
    weekly_actions: [],
    completed_action_ids: [],
    day: 1,
    streak: 0,
    total_days: 90,
    phase: { id: "foundation", name: "Foundation" },
    check_in_count: 0,
});

describe("authenticated product-shell intake gate", () => {
    beforeEach(() => {
        replace.mockReset();
        vi.mocked(useAuth).mockReturnValue({
            user: {
                id: "2b7be69f-4c5c-4dbc-89ef-3b83397a3ce2",
                email: "athlete@example.com",
                display_name: "Athlete",
                verified: true,
            },
            loading: false,
            signIn: vi.fn(),
            register: vi.fn(),
            signOut: vi.fn(),
            refreshUser: vi.fn(),
        });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("does not expose product routes before onboarding is complete", async () => {
        vi.spyOn(api, "getGamePlan").mockResolvedValue(plan(false));

        render(
            <ShellLayout>
                <p>Private product content</p>
            </ShellLayout>,
        );

        await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding"));
        expect(screen.queryByText("Private product content")).toBeNull();
    });

    it("renders the product shell only after a persisted intake", async () => {
        vi.spyOn(api, "getGamePlan").mockResolvedValue(plan(true));

        render(
            <ShellLayout>
                <p>Private product content</p>
            </ShellLayout>,
        );

        await screen.findByText("Private product content");
        expect(replace).not.toHaveBeenCalledWith("/onboarding");
    });

    it("fails closed with a retry instead of showing fallback product data", async () => {
        vi.spyOn(api, "getGamePlan").mockResolvedValue(null);

        render(
            <ShellLayout>
                <p>Private product content</p>
            </ShellLayout>,
        );

        await screen.findByRole("button", { name: "Try again" });
        expect(screen.queryByText("Private product content")).toBeNull();
    });
});
