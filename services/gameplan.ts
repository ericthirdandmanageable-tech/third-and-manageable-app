/** Game Plan completion service — authenticated web API. */
import { mobileApi } from "@/lib/mobile-api";
import type { GamePlanCompletion } from "@/types";

type ApiCompletion = GamePlanCompletion & { date: string };
type GamePlanResponse = {
  completion_count: number;
  completions: ApiCompletion[];
};

function todayDateStr(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function plan(): Promise<GamePlanResponse> {
  return mobileApi<GamePlanResponse>("/game-plan");
}

export async function getTodayCompletion(
  userId: string,
  actionId: string,
): Promise<GamePlanCompletion | null> {
  void userId;
  try {
    return (
      (await plan()).completions.find(
        (row) => row.action_id === actionId && row.date === todayDateStr(),
      ) ?? null
    );
  } catch {
    return null;
  }
}

export async function completeAction(
  userId: string,
  actionId: string,
): Promise<GamePlanCompletion> {
  void userId;
  const result = await mobileApi<GamePlanResponse>("/game-plan/actions/toggle", {
    method: "POST",
    body: { action_id: actionId },
  });
  const completion = result.completions.find(
    (row) => row.action_id === actionId && row.date === todayDateStr(),
  );
  if (!completion) throw new Error("The action was not saved.");
  return completion;
}

export async function getCompletionCount(userId: string): Promise<number> {
  void userId;
  try {
    return (await plan()).completion_count;
  } catch {
    return 0;
  }
}

export async function getRecentCompletions(
  userId: string,
): Promise<GamePlanCompletion[]> {
  void userId;
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return (await plan()).completions
      .filter((row) => new Date(row.completed_at) >= weekAgo)
      .sort((a, b) => b.completed_at.localeCompare(a.completed_at))
      .slice(0, 7);
  } catch {
    return [];
  }
}
