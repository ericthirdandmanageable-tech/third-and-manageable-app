// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AccountVerification from "@/components/athlete/AccountVerification";
import { api } from "@/lib/athlete/api";
import { useAuth } from "@/lib/athlete/auth";

vi.mock("@/lib/athlete/auth", () => ({ useAuth: vi.fn() }));

const refreshUser = vi.fn().mockResolvedValue(undefined);

function authUser(verified = false, requested = false) {
    vi.mocked(useAuth).mockReturnValue({
        user: {
            id: "2b7be69f-4c5c-4dbc-89ef-3b83397a3ce2",
            email: "athlete@example.com",
            display_name: "Athlete",
            school: "Example University",
            verified,
            verification_requested: requested,
        },
        loading: false,
        signIn: vi.fn(),
        register: vi.fn(),
        signOut: vi.fn(),
        refreshUser,
    });
}

describe("account verification panel", () => {
    beforeEach(() => {
        refreshUser.mockClear();
        authUser();
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("offers both university email and manual review routes", () => {
        render(<AccountVerification />);

        expect(screen.getByText("Verify with a .edu email")).toBeTruthy();
        expect(screen.getByText("Ask the team to review")).toBeTruthy();
        expect(screen.getByRole("button", { name: "Please verify my account" })).toBeTruthy();
    });

    it("sends a university confirmation and refreshes pending state", async () => {
        vi.spyOn(api, "requestUniversityVerification").mockResolvedValue({
            ok: true,
            message: "Confirmation sent.",
        });
        render(<AccountVerification />);

        fireEvent.change(screen.getByLabelText("University email"), {
            target: { value: "athlete@example.edu" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Email my confirmation link" }));

        await screen.findByText("Confirmation sent.");
        expect(api.requestUniversityVerification).toHaveBeenCalledWith(
            "athlete@example.edu",
        );
        await waitFor(() => expect(refreshUser).toHaveBeenCalledOnce());
    });

    it("collapses to confirmed status after verification", () => {
        authUser(true);
        render(<AccountVerification />);

        expect(screen.getByText("Verified community access")).toBeTruthy();
        expect(screen.queryByText("Verify with a .edu email")).toBeNull();
    });
});
