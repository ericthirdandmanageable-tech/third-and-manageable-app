/**
 * Community service — authenticated product API.
 *
 * Firestore remains the canonical staging store, but the mobile client never
 * receives database credentials and cannot choose its moderation identity.
 */
import { mobileApi } from "@/lib/mobile-api";
import type {
  ContentReport,
  Message,
  Profile,
  Room,
  SupportRequest,
  UserBlock,
} from "@/types";

const POLL_INTERVAL_MS = 5_000;

export async function getUserProfile(userId: string): Promise<Profile | null> {
  return mobileApi<Profile | null>(
    `/community/users/${encodeURIComponent(userId)}`,
  );
}

export async function getRoomByRoomId(roomId: string): Promise<Room | null> {
  return mobileApi<Room | null>(
    `/community/rooms?room_id=${encodeURIComponent(roomId)}`,
  );
}

export async function getGlobalRoom(): Promise<Room | null> {
  return getRoomByRoomId("global");
}

export async function getSchoolRoom(school: string): Promise<Room | null> {
  return mobileApi<Room | null>(
    `/community/rooms?school=${encodeURIComponent(school)}`,
  );
}

export function subscribeToRoom(
  roomId: string,
  onRoomUpdate: (room: Room) => void,
): () => void {
  let active = true;
  const poll = async () => {
    try {
      const room = await getRoomByRoomId(roomId);
      if (active && room) onRoomUpdate(room);
    } catch {
      // A later poll can recover from transient network/auth failures.
    }
  };
  void poll();
  const timer = setInterval(() => void poll(), POLL_INTERVAL_MS);
  return () => {
    active = false;
    clearInterval(timer);
  };
}

export async function getMessages(
  roomId: string,
  count = 50,
): Promise<Message[]> {
  return mobileApi<Message[]>(
    `/community/messages?room_id=${encodeURIComponent(roomId)}&limit=${Math.min(Math.max(count, 1), 100)}`,
  );
}

export async function sendMessage(
  roomId: string,
  _userId: string,
  _displayName: string,
  sport: string,
  _athleteStatus: string,
  content: string,
  _verified?: boolean,
): Promise<Message> {
  return mobileApi<Message>("/community/messages", {
    method: "POST",
    body: { room_id: roomId, sport, content: content.trim() },
  });
}

export function subscribeToMessages(
  roomId: string,
  onNewMessage: (message: Message) => void,
): () => void {
  let active = true;
  let initialized = false;
  const seen = new Set<string>();
  const poll = async () => {
    try {
      const messages = await getMessages(roomId, 50);
      if (!active) return;
      if (!initialized) {
        messages.forEach((message) => seen.add(message.id));
        initialized = true;
        return;
      }
      messages
        .slice()
        .reverse()
        .forEach((message) => {
          if (seen.has(message.id)) return;
          seen.add(message.id);
          onNewMessage(message);
        });
    } catch {
      // A later poll can recover from transient network/auth failures.
    }
  };
  void poll();
  const timer = setInterval(() => void poll(), POLL_INTERVAL_MS);
  return () => {
    active = false;
    clearInterval(timer);
  };
}

export async function createSupportRequest(
  _userId: string,
  type: "peer" | "moderator",
  message: string,
): Promise<SupportRequest> {
  const response = await mobileApi<{ id?: string; status: string }>(
    type === "peer" ? "/support/peer" : "/support/tech",
    {
      method: "POST",
      ...(type === "moderator" ? { body: { message } } : {}),
    },
  );
  return {
    id: response.id || `submitted_${Date.now()}`,
    user_id: "current",
    type,
    message: message.trim(),
    status: "pending",
    created_at: new Date().toISOString(),
  };
}

export async function reportMessage(
  _reporterId: string,
  message: Pick<Message, "id" | "user_id" | "room_id" | "content">,
  reason = "user_reported_from_app",
): Promise<ContentReport> {
  return mobileApi<ContentReport>("/community/reports", {
    method: "POST",
    body: { message_id: message.id, reason },
  });
}

export async function blockUser(
  _userId: string,
  blockedUserId: string,
): Promise<UserBlock> {
  return mobileApi<UserBlock>("/community/blocks", {
    method: "POST",
    body: { blocked_user_id: blockedUserId },
  });
}

export async function getBlockedUserIds(_userId: string): Promise<string[]> {
  const response = await mobileApi<{ blocked_user_ids: string[] }>(
    "/community/blocks",
  );
  return response.blocked_user_ids;
}

export function parseMentions(text: string): string[] {
  const regex = /@([A-Za-z][A-Za-z0-9 ]{1,30}?)(?=[,.\s!?;:]|$)/g;
  const mentions: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) mentions.push(match[1].trim());
  return [...new Set(mentions)];
}

export async function getUserIdByDisplayName(
  displayName: string,
): Promise<string | null> {
  const response = await mobileApi<{ user_id: string } | null>(
    `/community/users?display_name=${encodeURIComponent(displayName)}`,
  );
  return response?.user_id ?? null;
}
