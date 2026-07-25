import { useState, useEffect, useCallback } from 'react';
import { api, authStorage } from '../lib/api';
import { WORK_PATHS } from '../data/paths';
import { SKILL_MAP } from '../data/skills';
import { JOURNEY, WEEKLY_ACTIONS, getPhaseForDay } from '../data/journey';

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
  pathFit: WORK_PATHS.map((p) => ({ id: p.id, name: p.name, fit: p.fit, rationale: p.rationale, meta: p.meta })),
  weeklyActions: WEEKLY_ACTIONS,
  day: JOURNEY.day,
  streak: JOURNEY.streak,
  totalDays: JOURNEY.totalDays,
  phase: getPhaseForDay(JOURNEY.day),
  loading: false,
});

const LOCAL_KEY = 'tm_game_plan_v1';

const loadLocal = (): GamePlanData => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return { ...localDefault(), ...JSON.parse(raw) };
  } catch {}
  return localDefault();
};

export const useGamePlan = () => {
  const [data, setData] = useState<GamePlanData>(loadLocal);

  const hydrate = useCallback(async () => {
    if (!authStorage.getToken()) {
      setData((d) => ({ ...loadLocal(), ...d, loading: false }));
      return;
    }
    setData((d) => ({ ...d, loading: true }));
    const gp = await api.getGamePlan();
    if (!gp) {
      setData((d) => ({ ...d, loading: false }));
      return;
    }
    // Registry contract check: backend path_fit should mirror the local
    // WORK_PATHS registry. Drift is invisible until flagged — warn in dev only.
    if (import.meta.env.DEV && gp.path_fit.length) {
      const backendIds = new Set(gp.path_fit.map((p) => p.id));
      const localIds = new Set(WORK_PATHS.map((p) => p.id));
      const missing = [...localIds].filter((id) => !backendIds.has(id));
      const extra = [...backendIds].filter((id) => !localIds.has(id));
      if (missing.length || extra.length) {
        console.warn(
          '[registry drift] backend WORK_PATHS and frontend paths.ts diverge — ' +
          `missing in backend: [${missing}], only in backend: [${extra}]`
        );
      }
    }
    setData({
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
    });
  }, []);

  useEffect(() => { hydrate(); }, [hydrate]);

  const persistLocal = (next: GamePlanData) => {
    if (!authStorage.getToken()) {
      localStorage.setItem(LOCAL_KEY, JSON.stringify({
        intakeDone: next.intakeDone,
        intakeAnswers: next.intakeAnswers,
        committedPathId: next.committedPathId,
        completedActionIds: next.completedActionIds,
      }));
    }
  };

  const completeIntake = async (answers: Record<string, string>) => {
    if (authStorage.getToken()) {
      await api.submitIntake(answers);
      await hydrate();
      return;
    }
    setData((d) => {
      const next = { ...d, intakeDone: true, intakeAnswers: answers, skillMap: d.skillMap };
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