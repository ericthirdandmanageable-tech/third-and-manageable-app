/**
 * Notification Store service — Firebase Firestore.
 * Persists notifications with read/unread state.
 *
 * Collection: "notifications"
 */
import { db } from "@/lib/firebase";
import {
    addDoc,
    collection,
    doc,
    getDocs,
    limit,
    query,
    updateDoc,
    where,
    writeBatch
} from "firebase/firestore";

export interface StoredNotification {
  id: string;
  user_id: string;
  type: "checkin" | "streak" | "gameplan" | "milestone" | "welcome" | "mention";
  title: string;
  body: string;
  icon: string;
  timestamp: string;
  read: boolean;
  related_id?: string; // e.g., message ID for mentions
}

/**
 * Create a notification for a user.
 */
export async function createNotification(
  userId: string,
  data: Omit<StoredNotification, "id" | "user_id">,
): Promise<StoredNotification> {
  const notifData = {
    user_id: userId,
    ...data,
  };
  const ref = await addDoc(collection(db, "notifications"), notifData);
  return { id: ref.id, ...notifData };
}

/**
 * Get notifications for a user, ordered by timestamp desc.
 */
export async function getStoredNotifications(
  userId: string,
  count: number = 50,
): Promise<StoredNotification[]> {
  try {
    // Only equality filters — no composite index needed.
    // Sort client-side to avoid orderBy requiring a composite index.
    const q = query(
      collection(db, "notifications"),
      where("user_id", "==", userId),
      limit(count * 2),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as StoredNotification)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, count);
  } catch (err) {
    console.error("getStoredNotifications error:", err);
    return [];
  }
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "notifications", notificationId), {
      read: true,
    });
  } catch (err) {
    console.error("Failed to mark notification as read:", err);
  }
}

/**
 * Mark all unread notifications as read for a user.
 */
export async function markAllAsRead(userId: string): Promise<void> {
  try {
    const q = query(
      collection(db, "notifications"),
      where("user_id", "==", userId),
      where("read", "==", false),
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(d.ref, { read: true });
    });
    await batch.commit();
  } catch (err) {
    console.error("Failed to mark all as read:", err);
  }
}

/**
 * Get count of unread notifications for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const q = query(
      collection(db, "notifications"),
      where("user_id", "==", userId),
      where("read", "==", false),
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch {
    return 0;
  }
}

/**
 * Create a check-in notification for the user.
 */
export async function createCheckInNotification(
  userId: string,
  mood: number,
): Promise<void> {
  const moodLabels: Record<number, string> = {
    1: "Struggling",
    2: "Tough",
    3: "Okay",
    4: "Good",
    5: "Great",
  };
  const moodLabel = moodLabels[mood] ?? "Okay";
  const body =
    mood >= 4
      ? `You checked in feeling ${moodLabel}. Keep that momentum going!`
      : mood <= 2
        ? `You checked in feeling ${moodLabel}. Tough days build resilience.`
        : `You checked in feeling ${moodLabel}. Every check-in counts.`;

  await createNotification(userId, {
    type: "checkin",
    title: "Check-In Completed",
    body,
    icon: "heart",
    timestamp: new Date().toISOString(),
    read: false,
  });
}

/**
 * Create a streak milestone notification.
 */
export async function createStreakNotification(
  userId: string,
  streak: number,
): Promise<void> {
  const milestones = [3, 7, 14, 21, 30, 60, 90];
  if (!milestones.includes(streak)) return;

  const body =
    streak >= 30
      ? `${streak} days strong. That's elite-level consistency.`
      : streak >= 7
        ? `${streak} days in a row. You're building real momentum.`
        : `${streak}-day streak started. The foundation is being laid.`;

  await createNotification(userId, {
    type: "streak",
    title: `${streak}-Day Streak!`,
    body,
    icon: "flame",
    timestamp: new Date().toISOString(),
    read: false,
  });
}

/**
 * Create a game plan completion notification.
 */
export async function createGamePlanNotification(
  userId: string,
): Promise<void> {
  await createNotification(userId, {
    type: "gameplan",
    title: "Game Plan Completed",
    body: "You crushed today's action. One step closer to your next chapter.",
    icon: "clipboard",
    timestamp: new Date().toISOString(),
    read: false,
  });
}

/**
 * Create a mention notification.
 */
export async function createMentionNotification(
  userId: string,
  mentionedByName: string,
  roomName: string,
  messageId: string,
): Promise<void> {
  await createNotification(userId, {
    type: "mention",
    title: `${mentionedByName} mentioned you`,
    body: `You were mentioned in ${roomName}. Tap to see the message.`,
    icon: "at",
    timestamp: new Date().toISOString(),
    read: false,
    related_id: messageId,
  });
}
