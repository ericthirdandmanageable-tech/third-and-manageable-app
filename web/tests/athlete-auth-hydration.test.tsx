// @vitest-environment happy-dom

import { act, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, type ApiGamePlan, type ApiUser } from "../src/lib/athlete/api";
import { AuthProvider, useAuth, type AuthState } from "../src/lib/athlete/auth";
import {
    useCheckIns,
    type CheckInEntry,
} from "../src/lib/athlete/use-checkins";
import {
    useGamePlan,
    type GamePlanData,
} from "../src/lib/athlete/use-game-plan";

const user: ApiUser = {
    id: "2b7be69f-4c5c-4dbc-89ef-3b83397a3ce2",
    email: "athlete@example.com",
    display_name: "Athlete",
    verified: true,
};

const remotePlan: ApiGamePlan = {
    intake_done: true,
    skill_map: [],
    path_fit: [],
    committed_path_id: "consulting",
    weekly_actions: [],
    completed_action_ids: ["career-explore"],
    day: 12,
    streak: 4,
    total_days: 90,
    phase: { id: "foundation", name: "Foundation" },
    check_in_count: 1,
};

interface Snapshot {
    auth: AuthState;
    history: CheckInEntry[];
    checkInsLoading: boolean;
    plan: GamePlanData;
}

let latest: Snapshot | null = null;

function Probe({ onSnapshot }: { onSnapshot: (snapshot: Snapshot) => void }) {
    const auth = useAuth();
    const checkIns = useCheckIns();
    const { data: plan } = useGamePlan();
    useEffect(() => {
        onSnapshot({
            auth,
            history: checkIns.history,
            checkInsLoading: checkIns.loading,
            plan,
        });
    }, [auth, checkIns.history, checkIns.loading, onSnapshot, plan]);
    return null;
}

describe("athlete data hydration across auth transitions", () => {
    beforeEach(() => {
        latest = null;
        localStorage.clear();
        localStorage.setItem(
            "tm_checkins_v1",
            JSON.stringify([
                {
                    date: "2026-07-25",
                    promptId: "local-prompt",
                    option: "Local answer",
                },
            ]),
        );
        localStorage.setItem(
            "tm_game_plan_v1",
            JSON.stringify({
                intakeDone: false,
                committedPathId: "gig",
                completedActionIds: [],
            }),
        );

        vi.spyOn(api, "login").mockResolvedValue({
            access_token: "signed-token",
            user,
        });
        vi.spyOn(api, "logout").mockResolvedValue({ status: "ok" });
        vi.spyOn(api, "me").mockResolvedValue(user);
        vi.spyOn(api, "checkInHistory").mockResolvedValue([
            {
                id: "ce3e061a-bd30-4ca1-a585-099e7978c119",
                date: "2026-07-26",
                prompt_id: "remote-prompt",
                option: "Remote answer",
            },
        ]);
        vi.spyOn(api, "getGamePlan").mockResolvedValue(remotePlan);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("switches anonymous data to server data on sign-in and back on sign-out", async () => {
        render(
            <AuthProvider>
                <Probe onSnapshot={(snapshot) => (latest = snapshot)} />
            </AuthProvider>,
        );

        await waitFor(() => {
            expect(latest?.checkInsLoading).toBe(false);
            expect(latest?.history[0]?.promptId).toBe("local-prompt");
            expect(latest?.plan.loading).toBe(false);
            expect(latest?.plan.committedPathId).toBe("gig");
        });

        await act(async () => {
            expect(await latest?.auth.signIn("athlete@example.com", "password")).toBe(
                true,
            );
        });

        await waitFor(() => {
            expect(latest?.checkInsLoading).toBe(false);
            expect(latest?.history[0]?.promptId).toBe("remote-prompt");
            expect(latest?.plan.loading).toBe(false);
            expect(latest?.plan.committedPathId).toBe("consulting");
        });
        expect(api.checkInHistory).toHaveBeenCalledTimes(1);
        expect(api.getGamePlan).toHaveBeenCalledTimes(1);

        await act(async () => {
            await latest?.auth.signOut();
        });

        await waitFor(() => {
            expect(latest?.history[0]?.promptId).toBe("local-prompt");
            expect(latest?.plan.committedPathId).toBe("gig");
        });
        expect(localStorage.getItem("tm_access_token")).toBeNull();
    });

    it("waits for stored-token validation before committing a data source", async () => {
        localStorage.setItem("tm_access_token", "stored-token");
        localStorage.setItem("tm_user", JSON.stringify(user));
        const snapshots: Snapshot[] = [];

        render(
            <AuthProvider>
                <Probe
                    onSnapshot={(snapshot) => {
                        latest = snapshot;
                        snapshots.push(snapshot);
                    }}
                />
            </AuthProvider>,
        );

        await waitFor(() => {
            expect(latest?.checkInsLoading).toBe(false);
            expect(latest?.history[0]?.promptId).toBe("remote-prompt");
            expect(latest?.plan.loading).toBe(false);
            expect(latest?.plan.committedPathId).toBe("consulting");
        });

        expect(api.me).toHaveBeenCalledTimes(1);
        expect(
            snapshots
                .filter((snapshot) => !snapshot.checkInsLoading)
                .every((snapshot) => snapshot.history[0]?.promptId === "remote-prompt"),
        ).toBe(true);
    });
});
