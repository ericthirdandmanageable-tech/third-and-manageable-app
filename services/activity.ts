/**
 * Activity / Notifications service — Firebase Firestore.
 * Builds notifications from checkins and completions collections.
 */
import { db } from "@/lib/firebase";
import { collection, getDocs, limit, query, where } from "firebase/firestore";

export interface AppNotification {
  id: string;
  type: "checkin" | "streak" | "gameplan" | "milestone" | "welcome";
  title: string;
  body: string;
  icon: string;
  timestamp: string;
  read: boolean;
}

const MOOD_LABELS: Record<number, string> = {
  1: "Struggling",
  2: "Tough",
  3: "Okay",
  4: "Good",
  5: "Great",
};

/**
 * Build notifications from real user activity data.
 * Aggregates check-ins, game plan completions, and streak milestones.
 */
export async function getUserNotifications(
  userId: string,
  streak: number,
  joinedAt?: string,
): Promise<AppNotification[]> {
  const notifications: AppNotification[] = [];

  try {
    // Fetch recent check-ins (last 14 days)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const checkInsQ = query(
      collection(db, "checkins"),
      where("user_id", "==", userId),
      limit(40),
    );
    const checkInsSnap = await getDocs(checkInsQ);
    const twoWeeksAgoStr = twoWeeksAgo.toISOString();

    const recentCheckInDocs = checkInsSnap.docs.filter(
      (d) => (d.data().created_at ?? "") >= twoWeeksAgoStr,
    );
    for (const d of recentCheckInDocs) {
      const data = d.data();
      const mood = data.mood as number;
      const moodLabel = MOOD_LABELS[mood] ?? "Okay";
      notifications.push({
        id: `checkin_${d.id}`,
        type: "checkin",
        title: "Check-In Completed",
        body: `You checked in feeling ${moodLabel}. ${
          mood >= 4
            ? "Keep that momentum going!"
            : mood <= 2
              ? "Tough days build resilience. You showed up."
              : "Every check-in counts."
        }`,
        icon: "heart",
        timestamp: data.created_at,
        read: true,
      });
    }

    // Fetch recent game plan completions (last 14 days)
    const completionsQ = query(
      collection(db, "completions"),
      where("user_id", "==", userId),
      limit(40),
    );
    const completionsSnap = await getDocs(completionsQ);
    const recentCompletionDocs = completionsSnap.docs.filter(
      (d) => (d.data().completed_at ?? "") >= twoWeeksAgoStr,
    );

    for (const d of recentCompletionDocs) {
      const data = d.data();
      notifications.push({
        id: `gameplan_${d.id}`,
        type: "gameplan",
        title: "Game Plan Completed",
        body: "You crushed today's action. One step closer to your next chapter.",
        icon: "clipboard",
        timestamp: data.completed_at,
        read: true,
      });
    }

    // Streak milestones
    const streakMilestones = [3, 7, 14, 21, 30, 60, 90];
    for (const milestone of streakMilestones) {
      if (streak >= milestone) {
        notifications.push({
          id: `streak_${milestone}`,
          type: "streak",
          title: `${milestone}-Day Streak!`,
          body:
            milestone >= 30
              ? `${milestone} days strong. That's elite-level consistency.`
              : milestone >= 7
                ? `${milestone} days in a row. You're building real momentum.`
                : `${milestone}-day streak started. The foundation is being laid.`,
          icon: "flame",
          timestamp: new Date().toISOString(),
          read: streak > milestone,
        });
      }
    }

    // Welcome notification
    if (joinedAt) {
      notifications.push({
        id: "welcome",
        type: "welcome",
        title: "Welcome to Third & Manageable",
        body: "Your 90-day journey starts now. Check in daily, connect with athletes, and build your next chapter.",
        icon: "sparkles",
        timestamp: joinedAt,
        read: true,
      });
    }
  } catch (err) {
    console.log("Error building notifications:", err);
  }

  // Sort by timestamp descending
  notifications.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return notifications;
}
