/** Notification reads and read-state mutations through the authenticated API. */
import { mobileApi } from "@/lib/mobile-api";

export interface StoredNotification {
  id: string;
  user_id: string;
  type: "checkin" | "streak" | "gameplan" | "milestone" | "welcome" | "mention";
  title: string;
  body: string;
  icon: string;
  timestamp: string;
  read: boolean;
  related_id?: string;
}

export async function getStoredNotifications(
  _userId: string,
  count = 50,
): Promise<StoredNotification[]> {
  return mobileApi<StoredNotification[]>(
    `/notifications?limit=${Math.min(Math.max(count, 1), 100)}`,
  );
}

export async function markAsRead(notificationId: string): Promise<void> {
  await mobileApi<{ updated: number }>("/notifications", {
    method: "PATCH",
    body: { notification_id: notificationId },
  });
}

export async function markAllAsRead(_userId: string): Promise<void> {
  await mobileApi<{ updated: number }>("/notifications", {
    method: "PATCH",
    body: { mark_all: true },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  const notifications = await getStoredNotifications(userId, 100);
  return notifications.filter((notification) => !notification.read).length;
}
