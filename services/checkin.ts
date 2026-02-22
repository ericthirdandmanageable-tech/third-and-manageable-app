/**
 * Check-in service — Firebase Firestore.
 * Collection: "checkins" (auto-generated doc IDs, user_id field = Appwrite UID).
 * Streak updates go to "profiles/{userId}".
 *
 * IMPORTANT: We store a `date` field (YYYY-MM-DD) alongside `created_at` so we
 * can query "today's check-in" with a simple equality filter, avoiding the need
 * for Firestore composite indexes on range queries.
 */
import { db } from "@/lib/firebase";
import { CheckIn } from "@/types";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    updateDoc,
    where,
} from "firebase/firestore";

/** Get today's date as YYYY-MM-DD string in local timezone */
function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function createCheckIn(
  userId: string,
  mood: number,
  note: string | null,
  aiResponse: string | null,
): Promise<CheckIn> {
  const data = {
    user_id: userId,
    mood,
    note: note ?? "",
    ai_response: aiResponse ?? "",
    created_at: new Date().toISOString(),
    date: todayDateStr(),
  };
  const ref = await addDoc(collection(db, "checkins"), data);
  return { id: ref.id, ...data } as CheckIn;
}

export async function getTodayCheckIn(userId: string): Promise<CheckIn | null> {
  try {
    const q = query(
      collection(db, "checkins"),
      where("user_id", "==", userId),
      where("date", "==", todayDateStr()),
      limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as CheckIn;
  } catch (err) {
    console.error("getTodayCheckIn error:", err);
    return null;
  }
}

export async function getRecentCheckIns(
  userId: string,
  count: number = 7,
): Promise<CheckIn[]> {
  try {
    // Fetch more than needed, sort client-side (avoids composite index on orderBy)
    const q = query(
      collection(db, "checkins"),
      where("user_id", "==", userId),
      limit(count * 2),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as CheckIn)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, count);
  } catch {
    return [];
  }
}

export async function updateStreak(userId: string): Promise<void> {
  try {
    const profileRef = doc(db, "profiles", userId);
    const snap = await getDoc(profileRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const currentStreak = data.streak ?? 0;
    const lastCheckInDate = data.last_checkin_date ?? "";
    const today = todayDateStr();

    // Don't increment streak if already checked in today
    if (lastCheckInDate === today) return;

    // Check if yesterday was the last check-in (consecutive day)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

    const newStreak = lastCheckInDate === yesterdayStr ? currentStreak + 1 : 1;

    await updateDoc(profileRef, {
      streak: newStreak,
      last_checkin_date: today,
    });
  } catch (err) {
    console.error("Error updating streak:", err);
  }
}

/**
 * Get the number of check-ins in the last 7 days.
 */
export async function getWeeklyCheckInCount(userId: string): Promise<number> {
  try {
    // Fetch recent check-ins and filter client-side to avoid composite index
    const q = query(
      collection(db, "checkins"),
      where("user_id", "==", userId),
      limit(30),
    );
    const snap = await getDocs(q);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString();

    return snap.docs.filter((d) => {
      const createdAt = d.data().created_at ?? "";
      return createdAt >= weekAgoStr;
    }).length;
  } catch {
    return 0;
  }
}
