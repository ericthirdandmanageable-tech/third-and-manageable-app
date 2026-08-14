import { and, eq } from "drizzle-orm";

import type { AthleteUser } from "./auth";

import { WEEKLY_ACTIONS } from "@/lib/core/actions";
import { getPhaseForDay } from "@/lib/core/journey";
import { dayNumberFromDates, shiftCalendarDate, streakFromDates, todayISO, TOTAL_DAYS } from "@/lib/core/journey-math";
import { scorePathFit, WORK_PATHS } from "@/lib/core/paths";
import { deriveSkillMap, type SkillMapEntry } from "@/lib/core/skills";
import { getDb } from "@/lib/db";
import { actionCompletions, athleteProfiles, checkIns, commitments } from "@/lib/db/schema";

export function currentWeekMonday(today = todayISO()): string {
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
    return shiftCalendarDate(today, -((weekday + 6) % 7));
}

export async function gamePlanFor(user: AthleteUser) {
    const db = getDb();
    await db.insert(athleteProfiles).values({ userId: user.id }).onConflictDoNothing();
    const [profileRows, commitmentRows, completedRows, dateRows] = await Promise.all([
        db.select().from(athleteProfiles).where(eq(athleteProfiles.userId, user.id)).limit(1),
        db.select().from(commitments).where(eq(commitments.userId, user.id)).limit(1),
        db.select({ actionId: actionCompletions.actionId }).from(actionCompletions).where(and(
            eq(actionCompletions.userId, user.id),
            eq(actionCompletions.weekOf, currentWeekMonday()),
        )),
        db.select({ date: checkIns.date }).from(checkIns).where(eq(checkIns.userId, user.id)),
    ]);
    const profile = profileRows[0];
    const answers = (profile.intakeAnswers ?? {}) as Record<string, string>;
    const skillMap = (profile.skillMap ?? (profile.intakeDone ? deriveSkillMap(answers) : [])) as SkillMapEntry[];
    const pathFit = profile.intakeDone
        ? scorePathFit(answers, skillMap).map((path) => ({
            id: path.id,
            name: path.name,
            fit: path.fit,
            rationale: path.rationale,
            meta: path.meta,
        }))
        : WORK_PATHS.map(({ id, name, fit, rationale, meta }) => ({ id, name, fit, rationale, meta }));
    const dates = dateRows.map((row) => row.date);
    const day = dayNumberFromDates(dates);
    const phase = getPhaseForDay(day);
    return {
        intake_done: profile.intakeDone,
        skill_map: skillMap,
        path_fit: pathFit,
        committed_path_id: commitmentRows[0]?.pathId ?? null,
        weekly_actions: WEEKLY_ACTIONS,
        completed_action_ids: completedRows.map((row) => row.actionId),
        day,
        streak: streakFromDates(dates),
        total_days: TOTAL_DAYS,
        phase: { id: phase.id, name: phase.name },
        check_in_count: dates.length,
    };
}
