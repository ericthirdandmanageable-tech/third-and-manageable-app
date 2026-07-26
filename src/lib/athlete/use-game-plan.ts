"use client";

import { useCallback, useEffect, useState } from "react";

import { api, authStorage } from "./api";
import { WEEKLY_ACTIONS } from "@/lib/core/actions";
import { JOURNEY, getPhaseForDay } from "@/lib/core/journey";
import { WORK_PATHS } from "@/lib/core/paths";
import { SKILL_MAP } from "@/lib/core/skills";

/*
 * Game Plan state — backend-backed when authenticated, local-registry fallback
 * when offline (REDESIGN_BRIEF §4). The same hook serves both, so the UI never
 * branches on data source.
 */

export interface GamePlanData {
    intakeDone: boolean;
    intakeAnswers: Record<string, string>;
    committedPathId: string | null;
    completedActionIds: string[];
    skillMap: { skill: string; translation: string; origin: string }[];
    pathFit: { id: string; name: string; fit: string; rationale: string; meta: string }[];
    weeklyActions: { id: string; kind: string; text: string }[];
    day: number;
    streak: number;
    totalDays: number;
    phase: { id: string; name: string };
    loading: boolean;
}

const localDefault = (): GamePlanData => ({
    intakeDone: false,
    intakeAnswers: {},
    committedPathId: null,
    completedActionIds: [],
    skillMap: SKILL_MAP,
    pathFit: WORK_PATHS.map((p) => ({
        id: p.id,
        name: p.name,
        fit: p.fit,
        rationale: p.rationale,
        meta: p.meta,
    })),
    weeklyActions: WEEKLY_ACTIONS,
    day: JOURNEY.day,
    streak: JOURNEY.streak,
    totalDays: JOURNEY.totalDays,
    phase: getPhaseForDay(JOURNEY.day),
    loading: false,
});

const LOCAL_KEY = "tm_game_plan_v1";

const loadLocal = (): GamePlanData => {
    if (typeof window === "undefined") return localDefault();
    try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) return { ...localDefault(), ...JSON.parse(raw) };
    } catch {
        /* corrupted state → registry defaults */
    }
    return localDefault();
};

/** Resolves the plan from the backend when signed in, storage otherwise. */
const loadPlan = async (): Promise<GamePlanData | null> => {
    if (!authStorage.getToken()) return { ...loadLocal(), loading: false };

    const gp = await api.getGamePlan();
    if (!gp) return null; // request failed — keep whatever is on screen

    // Registry contract check: backend path_fit should mirror the local
    // WORK_PATHS registry. Drift is invisible until flagged — warn in dev only.
    if (process.env.NODE_ENV !== "production" && gp.path_fit.length) {
        const backendIds = new Set(gp.path_fit.map((p) => p.id));
        const localIds = new Set(WORK_PATHS.map((p) => p.id));
        const missing = [...localIds].filter((id) => !backendIds.has(id));
        const extra = [...backendIds].filter((id) => !localIds.has(id));
        if (missing.length || extra.length) {
            console.warn(
                "[registry drift] backend WORK_PATHS and lib/core/paths.ts diverge — " +
                    `missing in backend: [${missing}], only in backend: [${extra}]`,
            );
        }
    }

    return {
        intakeDone: gp.intake_done,
        intakeAnswers: {},
        committedPathId: gp.committed_path_id,
        completedActionIds: gp.completed_action_ids,
        skillMap: gp.skill_map.length ? gp.skill_map : SKILL_MAP,
        pathFit: gp.path_fit.length ? gp.path_fit : localDefault().pathFit,
        weeklyActions: gp.weekly_actions.length ? gp.weekly_actions : WEEKLY_ACTIONS,
        day: gp.day,
        streak: gp.streak,
        totalDays: gp.total_days,
        phase: gp.phase,
        loading: false,
    };
};

export const useGamePlan = () => {
    // Registry defaults during the server render; the effect folds in stored
    // and remote state once mounted.
    const [data, setData] = useState<GamePlanData>(localDefault);

    const hydrate = useCallback(async () => {
        const next = await loadPlan();
        // A failed refetch keeps what is on screen — an optimistic toggle that
        // already went through must not be reverted by a flaky network.
        setData((prev) => next ?? { ...prev, loading: false });
    }, []);

    useEffect(() => {
        // See the note in use-checkins: guard the unmount race.
        let cancelled = false;
        (async () => {
            const next = await loadPlan();
            if (!cancelled && next) setData(next);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const persistLocal = (next: GamePlanData) => {
        if (!authStorage.getToken()) {
            localStorage.setItem(
                LOCAL_KEY,
                JSON.stringify({
                    intakeDone: next.intakeDone,
                    intakeAnswers: next.intakeAnswers,
                    committedPathId: next.committedPathId,
                    completedActionIds: next.completedActionIds,
                }),
            );
        }
    };

    const completeIntake = async (answers: Record<string, string>) => {
        if (authStorage.getToken()) {
            await api.submitIntake(answers);
            await hydrate();
            return;
        }
        setData((d) => {
            const next = { ...d, intakeDone: true, intakeAnswers: answers };
            persistLocal(next);
            return next;
        });
    };

    const commitToPath = async (pathId: string | null) => {
        if (authStorage.getToken()) {
            // null = un-commit — a real backend action, not a silent no-op
            await api.commitPath(pathId);
            await hydrate();
            return;
        }
        setData((d) => {
            const next = { ...d, committedPathId: pathId };
            persistLocal(next);
            return next;
        });
    };

    const toggleAction = async (actionId: string) => {
        if (authStorage.getToken()) {
            await api.toggleAction(actionId);
            await hydrate();
            return;
        }
        setData((d) => {
            const done = d.completedActionIds.includes(actionId);
            const next = {
                ...d,
                completedActionIds: done
                    ? d.completedActionIds.filter((id) => id !== actionId)
                    : [...d.completedActionIds, actionId],
            };
            persistLocal(next);
            return next;
        });
    };

    return { data, completeIntake, commitToPath, toggleAction, hydrate };
};
