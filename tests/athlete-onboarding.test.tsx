// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OnboardingPage from "../src/app/(athlete)/onboarding/page";
import { api, type ApiGamePlan, type ApiUser } from "../src/lib/athlete/api";
import { useAuth } from "../src/lib/athlete/auth";

const replace = vi.fn();
const refreshUser = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ replace }),
}));

vi.mock("../src/lib/athlete/auth", () => ({
    useAuth: vi.fn(),
}));

vi.mock("@/components/athlete/UniversityFinder", () => ({
    default: ({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) => (
        <input aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
    ),
}));

const user: ApiUser = {
    id: "2b7be69f-4c5c-4dbc-89ef-3b83397a3ce2",
    email: "athlete@example.com",
    display_name: "Athlete",
    verified: true,
};

const incompletePlan: ApiGamePlan = {
    intake_done: false,
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
};

const reachFinalStep = () => {
    fireEvent.click(screen.getByRole("button", { name: /Former Athlete/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Football" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.change(screen.getByRole("textbox", { name: "School / University" }), {
        target: { value: "Case Western Reserve University" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: /Yes, I'm interested/ }));
};

describe("authenticated athlete onboarding", () => {
    beforeEach(() => {
        replace.mockReset();
        refreshUser.mockReset();
        localStorage.clear();
        vi.mocked(useAuth).mockReturnValue({
            user,
            loading: false,
            signIn: vi.fn(),
            register: vi.fn(),
            signOut: vi.fn(),
            refreshUser,
        });
        vi.spyOn(api, "getGamePlan").mockResolvedValue(incompletePlan);
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("matches the original four-step questions and sport options", () => {
        render(<OnboardingPage />);
        expect(screen.getByRole("heading", { name: "Are you a Current or Former Athlete?" })).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: /Current Athlete/ }));
        fireEvent.click(screen.getByRole("button", { name: "Continue" }));
        expect(screen.getByRole("heading", { name: "What's your sport?" })).toBeTruthy();
        for (const sport of ["Basketball", "Football", "Soccer", "Hockey", "Baseball", "Tennis", "Swimming", "Track & Field", "Volleyball", "Softball", "Wrestling", "Lacrosse", "Golf", "Gymnastics", "Other Sport"]) {
            expect(screen.getByRole("button", { name: sport })).toBeTruthy();
        }
    });

    it("saves the original onboarding profile and then enters the app", async () => {
        const submitOnboarding = vi.spyOn(api, "submitOnboarding").mockResolvedValue({ status: "ok" });
        render(<OnboardingPage />);
        reachFinalStep();
        fireEvent.click(screen.getByRole("button", { name: "Get Started" }));

        await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
        expect(submitOnboarding).toHaveBeenCalledWith({
            athlete_status: "former",
            sport: "football",
            display_name: "Athlete",
            school: "Case Western Reserve University",
            group_interest: true,
        });
        expect(refreshUser).toHaveBeenCalledOnce();
    });

    it("retains the answers when saving fails", async () => {
        vi.spyOn(api, "submitOnboarding").mockResolvedValue(null);
        render(<OnboardingPage />);
        reachFinalStep();
        fireEvent.click(screen.getByRole("button", { name: "Get Started" }));

        expect(await screen.findByRole("alert")).toBeTruthy();
        expect(screen.getByRole("button", { name: /Yes, I'm interested/ }).getAttribute("aria-pressed")).toBe("true");
        expect(replace).not.toHaveBeenCalledWith("/");
    });
});
