// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AthleteAuthForm from "../src/components/athlete/AthleteAuthForm";
import { api } from "../src/lib/athlete/api";
import { useAuth } from "../src/lib/athlete/auth";

const replace = vi.fn();
let requestedPath: string | null = null;

vi.mock("next/navigation", () => ({
    useRouter: () => ({ replace }),
    useSearchParams: () =>
        new URLSearchParams(requestedPath ? { next: requestedPath } : undefined),
}));

vi.mock("../src/lib/athlete/auth", () => ({
    useAuth: vi.fn(),
}));

const signIn = vi.fn();
const register = vi.fn();

describe("login-first athlete NUX", () => {
    beforeEach(() => {
        requestedPath = null;
        replace.mockReset();
        signIn.mockReset().mockResolvedValue(true);
        register.mockReset().mockResolvedValue(true);
        vi.mocked(useAuth).mockReturnValue({
            user: null,
            loading: false,
            signIn,
            register,
            signOut: vi.fn(),
            refreshUser: vi.fn(),
        });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("resumes incomplete returning accounts in onboarding", async () => {
        vi.spyOn(api, "getGamePlan").mockResolvedValue({
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
        });

        render(<AthleteAuthForm />);
        fireEvent.change(screen.getByPlaceholderText("Email address"), {
            target: { value: "athlete@example.com" },
        });
        fireEvent.change(screen.getByPlaceholderText("Password (8+ characters)"), {
            target: { value: "password" },
        });
        fireEvent.submit(
            screen.getAllByRole("button", { name: "Sign in" }).at(-1)!.closest("form")!,
        );

        await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding"));
    });

    it("honors a safe requested route after completed onboarding", async () => {
        requestedPath = "/community";
        vi.spyOn(api, "getGamePlan").mockResolvedValue({
            intake_done: true,
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

        render(<AthleteAuthForm />);
        fireEvent.change(screen.getByPlaceholderText("Email address"), {
            target: { value: "athlete@example.com" },
        });
        fireEvent.change(screen.getByPlaceholderText("Password (8+ characters)"), {
            target: { value: "password" },
        });
        fireEvent.submit(
            screen.getAllByRole("button", { name: "Sign in" }).at(-1)!.closest("form")!,
        );

        await waitFor(() => expect(replace).toHaveBeenCalledWith("/community"));
    });

    it("fails into the authenticated shell gate when plan lookup is unavailable", async () => {
        vi.spyOn(api, "getGamePlan").mockResolvedValue(null);

        render(<AthleteAuthForm />);
        fireEvent.change(screen.getByPlaceholderText("Email address"), {
            target: { value: "athlete@example.com" },
        });
        fireEvent.change(screen.getByPlaceholderText("Password (8+ characters)"), {
            target: { value: "password" },
        });
        fireEvent.submit(
            screen.getAllByRole("button", { name: "Sign in" }).at(-1)!.closest("form")!,
        );

        await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
        expect(replace).not.toHaveBeenCalledWith("/onboarding");
    });

    it("creates the account before entering onboarding", async () => {
        const getGamePlan = vi.spyOn(api, "getGamePlan").mockResolvedValue(null);
        render(<AthleteAuthForm />);
        fireEvent.click(screen.getByRole("tab", { name: "Create account" }));
        fireEvent.change(screen.getByPlaceholderText("Display name"), {
            target: { value: "Jordan Athlete" },
        });
        const universityFinder = screen.getByRole("combobox", { name: "University" });
        fireEvent.change(universityFinder, { target: { value: "Bowling Gr" } });
        fireEvent.click(
            await screen.findByRole("option", {
                name: /Bowling Green State University-Main Campus/i,
            }),
        );
        fireEvent.change(screen.getByPlaceholderText("Email address"), {
            target: { value: "jordan@example.com" },
        });
        fireEvent.change(screen.getByPlaceholderText("Password (8+ characters)"), {
            target: { value: "password" },
        });
        fireEvent.submit(
            screen.getByRole("button", { name: "Create my account" }).closest("form")!,
        );

        await waitFor(() =>
            expect(register).toHaveBeenCalledWith(
                "jordan@example.com",
                "password",
                "Jordan Athlete",
                "Bowling Green State University-Main Campus",
            ),
        );
        expect(replace).toHaveBeenCalledWith("/onboarding");
        expect(getGamePlan).not.toHaveBeenCalled();
    });
});
