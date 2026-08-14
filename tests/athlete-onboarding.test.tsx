// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OnboardingPage from "../src/app/(athlete)/onboarding/page";
import { api, type ApiGamePlan, type ApiUser } from "../src/lib/athlete/api";
import { useAuth } from "../src/lib/athlete/auth";

const replace = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push, replace }),
}));

vi.mock("../src/lib/athlete/auth", () => ({
    useAuth: vi.fn(),
}));

vi.mock("@/components/athlete/IntakeFlow", () => ({
    default: ({
        onComplete,
        initialAnswers,
        startAtEnd,
    }: {
        onComplete: (answers: Record<string, string>) => void;
        initialAnswers?: Record<string, string>;
        startAtEnd?: boolean;
    }) => (
        <>
            <output data-testid="intake-resume-state">
                {startAtEnd ? JSON.stringify(initialAnswers) : "fresh"}
            </output>
            <button
                onClick={() =>
                    onComplete({
                        sport: "Football",
                        role: "Captain / Leader",
                    })
                }
            >
                Complete intake
            </button>
        </>
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
    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));
    fireEvent.click(
        screen.getByRole("button", {
            name: "I've transitioned or am transitioning out of competitive sport.",
        }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete intake" }));
    fireEvent.click(screen.getByRole("button", { name: /Count me in/ }));
};

describe("authenticated athlete onboarding", () => {
    beforeEach(() => {
        replace.mockReset();
        push.mockReset();
        vi.mocked(useAuth).mockReturnValue({
            user,
            loading: false,
            signIn: vi.fn(),
            register: vi.fn(),
            signOut: vi.fn(),
            refreshUser: vi.fn(),
        });
        vi.spyOn(api, "getGamePlan").mockResolvedValue(incompletePlan);
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("persists status before intake and only then shows completion", async () => {
        const updateProfile = vi.spyOn(api, "updateProfile").mockResolvedValue({
            ...user,
            status: "transitioning",
        });
        const submitIntake = vi.spyOn(api, "submitIntake").mockResolvedValue({ status: "ok" });

        render(<OnboardingPage />);
        reachFinalStep();
        fireEvent.click(screen.getByRole("button", { name: "Finish" }));

        await screen.findByRole("heading", { name: "You're in the game." });
        expect(updateProfile).toHaveBeenCalledWith({ status: "transitioning" });
        expect(submitIntake).toHaveBeenCalledWith({
            sport: "Football",
            role: "Captain / Leader",
            community: "join",
        });
        expect(updateProfile.mock.invocationCallOrder[0]).toBeLessThan(
            submitIntake.mock.invocationCallOrder[0],
        );
    });

    it("retains the flow and skips intake completion when status cannot save", async () => {
        vi.spyOn(api, "updateProfile").mockResolvedValue(null);
        const submitIntake = vi.spyOn(api, "submitIntake").mockResolvedValue({ status: "ok" });

        render(<OnboardingPage />);
        reachFinalStep();
        fireEvent.click(screen.getByRole("button", { name: "Finish" }));

        await screen.findByRole("alert");
        expect(screen.getByText(/couldn’t save where you are in your journey/i)).toBeTruthy();
        expect(screen.queryByRole("heading", { name: "You're in the game." })).toBeNull();
        expect(submitIntake).not.toHaveBeenCalled();
        await waitFor(() =>
            expect(
                (screen.getByRole("button", { name: "Finish" }) as HTMLButtonElement)
                    .disabled,
            ).toBe(false),
        );
    });

    it("restores intake answers when backing up from the community choice", () => {
        render(<OnboardingPage />);
        reachFinalStep();

        fireEvent.click(screen.getByRole("button", { name: "Back" }));

        expect(screen.getByTestId("intake-resume-state").textContent).toBe(
            JSON.stringify({
                sport: "Football",
                role: "Captain / Leader",
            }),
        );
    });
});
