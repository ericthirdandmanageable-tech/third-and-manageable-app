/**
 * Check-in service — authenticated web API.
 *
 * New clients never write Firestore directly. The server owns the check-in,
 * streak update, and Clipboard coaching response as one controlled domain.
 */
import { mobileApi } from "@/lib/mobile-api";
import type { AIPersonality, CheckIn } from "@/types";

type ApiCheckIn = CheckIn & {
  date: string;
  journal?: string | null;
  option?: string;
  prompt_id?: string;
};

export async function createCheckIn(
  userId: string,
  mood: number,
  note: string | null,
  aiResponse: string | null,
  sport?: string,
  personality?: AIPersonality,
): Promise<CheckIn> {
  void userId;
  void aiResponse;
  return mobileApi<ApiCheckIn>("/check-ins", {
    method: "POST",
    body: {
      mood,
      note,
      persona: personality,
      sport,
    },
  });
}

export async function getTodayCheckIn(
  userId: string,
): Promise<CheckIn | null> {
  void userId;
  try {
    return await mobileApi<ApiCheckIn | null>("/check-ins/today");
  } catch {
    return null;
  }
}

export async function getRecentCheckIns(
  userId: string,
  count: number = 7,
): Promise<CheckIn[]> {
  void userId;
  try {
    const rows = await mobileApi<ApiCheckIn[]>("/check-ins");
    return rows.slice(0, count);
  } catch {
    return [];
  }
}

/** Streaks are updated atomically by the server when a check-in is created. */
export async function updateStreak(userId: string): Promise<void> {
  void userId;
}

export async function getWeeklyCheckInCount(userId: string): Promise<number> {
  const rows = await getRecentCheckIns(userId, 90);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return rows.filter((row) => new Date(row.created_at) >= weekAgo).length;
}

export async function getCheckInCount(userId: string): Promise<number> {
  void userId;
  try {
    return (await mobileApi<{ check_in_count: number }>("/game-plan")).check_in_count;
  } catch {
    return 0;
  }
}
