/**
 * Game Plan service — Firebase Firestore.
 * Collection: "completions" (auto-generated doc IDs, user_id = Appwrite UID).
 *
 * Uses a `date` field (YYYY-MM-DD) for "today" queries to avoid
 * composite indexes on range operators.
 */
import { db } from "@/lib/firebase";
import { GamePlanCompletion } from "@/types";
import {
    addDoc,
    collection,
    getCountFromServer,
    getDocs,
    limit,
    query,
    where,
} from "firebase/firestore";

/** Get today's date as YYYY-MM-DD string in local timezone */
function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Check if today's action has already been completed.
 * Uses exact equality on `date` field — no composite index needed.
 */
export async function getTodayCompletion(
  userId: string,
  actionId: string,
): Promise<GamePlanCompletion | null> {
  try {
    const q = query(
      collection(db, "completions"),
      where("user_id", "==", userId),
      where("action_id", "==", actionId),
      where("date", "==", todayDateStr()),
      limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as GamePlanCompletion;
  } catch (err) {
    console.error("getTodayCompletion error:", err);
    return null;
  }
}

/**
 * Mark today's action as completed.
 */
export async function completeAction(
  userId: string,
  actionId: string,
): Promise<GamePlanCompletion> {
  const data = {
    user_id: userId,
    action_id: actionId,
    completed_at: new Date().toISOString(),
    date: todayDateStr(),
  };
  const ref = await addDoc(collection(db, "completions"), data);
  return { id: ref.id, ...data } as GamePlanCompletion;
}

/**
 * Get the count of total completed actions for a user.
 */
export async function getCompletionCount(userId: string): Promise<number> {
  try {
    const q = query(
      collection(db, "completions"),
      where("user_id", "==", userId),
    );
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch {
    return 0;
  }
}

/**
 * Get recent completions for a user (last 7 days).
 * Fetches all user completions and filters/sorts client-side to avoid composite index.
 */
export async function getRecentCompletions(
  userId: string,
): Promise<GamePlanCompletion[]> {
  try {
    const q = query(
      collection(db, "completions"),
      where("user_id", "==", userId),
      limit(50),
    );
    const snap = await getDocs(q);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString();

    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as GamePlanCompletion)
      .filter((c) => c.completed_at >= weekAgoStr)
      .sort((a, b) => b.completed_at.localeCompare(a.completed_at))
      .slice(0, 7);
  } catch {
    return [];
  }
}
