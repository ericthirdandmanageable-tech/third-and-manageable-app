// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ProfilePage from "../src/app/(athlete)/(shell)/profile/page";
import { api, type ApiUser } from "@/lib/athlete/api";
import { useAuth } from "@/lib/athlete/auth";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push, replace }),
}));

vi.mock("@/lib/athlete/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/athlete/app-theme", () => ({
    useAppTheme: () => ({ theme: "dusk", setTheme: vi.fn() }),
}));
vi.mock("@/lib/athlete/use-game-plan", () => ({
    useGamePlan: () => ({
        data: {
            intakeDone: false,
            intakeAnswers: {},
            committedPathId: null,
            skillMap: [],
        },
    }),
}));
vi.mock("@/lib/athlete/use-checkins", () => ({
    useCheckIns: () => ({ streak: 0, dayNumber: 1, history: [] }),
}));
vi.mock("@/components/athlete/AccountVerification", () => ({
    default: () => <div>Verification panel</div>,
}));
vi.mock("@/components/athlete/UniversityFinder", () => ({
    default: ({ value, onChange, label }: {
        value: string;
        onChange: (value: string) => void;
        label: string;
    }) => (
        <input
            aria-label={label}
            value={value}
            onChange={(event) => onChange(event.target.value)}
        />
    ),
}));

const refreshUser = vi.fn();
const user: ApiUser = {
    id: "athlete-1",
    email: "athlete@example.com",
    display_name: "Athlete",
    school: "Example University",
    status: "transitioning",
    headline: null,
    verified: true,
};

describe("profile university selector", () => {
    beforeEach(() => {
        push.mockReset();
        replace.mockReset();
        refreshUser.mockReset().mockResolvedValue(undefined);
        vi.mocked(useAuth).mockReturnValue({
            user,
            loading: false,
            signIn: vi.fn(),
            register: vi.fn(),
            signOut: vi.fn(),
            refreshUser,
        });
        vi.spyOn(api, "getProfile").mockResolvedValue({
            user_id: user.id,
            intake_done: false,
            intake_answers: {},
            skill_map: [],
        });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("uses the onboarding selector and warns before a verified school change", async () => {
        const updateProfile = vi.spyOn(api, "updateProfile").mockResolvedValue({
            ...user,
            school: "Another University",
            verified: false,
            verification_requested: false,
        });
        render(<ProfilePage />);

        fireEvent.click(screen.getByRole("button", { name: "Edit" }));
        const selector = screen.getByRole("textbox", { name: "School / University" });
        expect(selector.getAttribute("value")).toBe("Example University");

        fireEvent.change(selector, { target: { value: "Another University" } });
        expect(screen.getByText(/will remove your current verification/i)).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({
            display_name: "Athlete",
            school: "Another University",
            status: "transitioning",
            headline: "",
        }));
        expect(refreshUser).toHaveBeenCalledOnce();
    });

    it("requires an explicit destructive confirmation before account deletion", async () => {
        const deleteAccount = vi.spyOn(api, "deleteAccount").mockResolvedValue({ status: "deleted" });
        render(<ProfilePage />);

        fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
        const confirmButton = screen.getByRole("button", { name: "Delete my account" });
        expect(confirmButton.hasAttribute("disabled")).toBe(true);

        fireEvent.change(screen.getByLabelText(/Type DELETE to confirm/), {
            target: { value: "DELETE" },
        });
        fireEvent.click(confirmButton);

        await waitFor(() => expect(deleteAccount).toHaveBeenCalledOnce());
        expect(replace).toHaveBeenCalledWith("/login");
    });
});
