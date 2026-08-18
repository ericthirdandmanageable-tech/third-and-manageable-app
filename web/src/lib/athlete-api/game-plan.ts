import type { AthleteUser } from "./auth";

import { WEEKLY_ACTIONS } from "@/lib/core/actions";
import { getPhaseForDay } from "@/lib/core/journey";
import {
  dayNumberFromDates,
  shiftCalendarDate,
  streakFromDates,
  todayISO,
  TOTAL_DAYS,
} from "@/lib/core/journey-math";
import { scorePathFit, WORK_PATHS } from "@/lib/core/paths";
import { deriveSkillMap, type SkillMapEntry } from "@/lib/core/skills";
import {
  getProductProfile,
  listCheckIns,
  listCompletions,
} from "@/lib/firestore-product";

export function currentWeekMonday(today = todayISO()): string {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  return shiftCalendarDate(today, -((weekday + 6) % 7));
}

export async function gamePlanFor(user: AthleteUser) {
  const [profile, completions, checkIns] = await Promise.all([
    getProductProfile(user.id),
    listCompletions(user.id),
    listCheckIns(user.id),
  ]);
  const answers = (profile?.intake_answers ?? {}) as Record<string, string>;
  const intakeDone = profile?.intake_done === true;
  const skillMap = (profile?.skill_map ?? (intakeDone ? deriveSkillMap(answers) : [])) as SkillMapEntry[];
  const pathFit = intakeDone
    ? scorePathFit(answers, skillMap).map(({ id, name, fit, rationale, meta }) => ({
        id,
        name,
        fit,
        rationale,
        meta,
      }))
    : WORK_PATHS.map(({ id, name, fit, rationale, meta }) => ({ id, name, fit, rationale, meta }));
  const dates = checkIns.map((row) => row.date);
  const day = dayNumberFromDates(dates);
  const phase = getPhaseForDay(day);
  return {
    intake_done: intakeDone,
    skill_map: skillMap,
    path_fit: pathFit,
    committed_path_id: profile?.committed_path_id ?? null,
    weekly_actions: WEEKLY_ACTIONS,
    completed_action_ids: completions
      .filter((row) => row.week_of === currentWeekMonday())
      .map((row) => row.action_id),
    day,
    streak: streakFromDates(dates),
    total_days: TOTAL_DAYS,
    phase: { id: phase.id, name: phase.name },
    check_in_count: dates.length,
    completion_count: completions.length,
    completions: completions.map((completion) => ({
      id: completion.id,
      user_id: completion.user_id,
      action_id: completion.action_id,
      completed_at: completion.completed_at,
      date: completion.date,
    })),
  };
}
