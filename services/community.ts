/**
 * Community service — Firebase Firestore.
 * Collections: "rooms", "messages", "support_requests".
 * Realtime via Firestore onSnapshot (replaces Appwrite Realtime).
 */
import { db } from "@/lib/firebase";
import {
  ContentReport,
  Message,
  Profile,
  Room,
  SupportRequest,
  UserBlock,
} from "@/types";
import {
  addDoc,
  collection,
  doc,
  limit as fsLimit,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";

// ─── User Profile Lookup ─────────────────────────────────────────────

/** Fetch a user's public profile by their user ID */
export async function getUserProfile(userId: string): Promise<Profile | null> {
  try {
    const snap = await getDoc(doc(db, "profiles", userId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      display_name: data.display_name || "Unknown",
      email: data.email || "",
      sport: data.sport || "other",
      athlete_status: data.athlete_status || "former",
      school: data.school || "N/A",
      group_interest: data.group_interest ?? false,
      current_quarter: data.current_quarter ?? 1,
      streak: data.streak ?? 0,
      joined_at: data.joined_at || "",
      verified: data.verified === true,
      verification_requested: data.verification_requested === true,
      profile_pic: data.profile_pic || undefined,
      ai_personality: data.ai_personality || undefined,
    } as Profile;
  } catch {
    return null;
  }
}

// ─── Rooms ───────────────────────────────────────────────────────────

/** Fetch a room by its room_id field */
export async function getRoomByRoomId(roomId: string): Promise<Room | null> {
  try {
    const q = query(
      collection(db, "rooms"),
      where("room_id", "==", roomId),
      fsLimit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    const data = d.data();
    return {
      id: d.id,
      room_id: data.room_id,
      name: data.name,
      type: data.type,
      school: data.school ?? null,
      daily_prompt: data.daily_prompt ?? "",
      daily_prompt_author: data.daily_prompt_author ?? "",
      daily_prompt_updated_at: data.daily_prompt_updated_at ?? "",
      created_at: data.created_at ?? "",
    } as Room;
  } catch {
    return null;
  }
}

/** Fetch the global athlete room */
export async function getGlobalRoom(): Promise<Room | null> {
  return getRoomByRoomId("global");
}

/** Fetch a school-specific room */
export async function getSchoolRoom(school: string): Promise<Room | null> {
  try {
    const q = query(
      collection(db, "rooms"),
      where("type", "==", "school"),
      where("school", "==", school),
      fsLimit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    const data = d.data();
    return {
      id: d.id,
      room_id: data.room_id,
      name: data.name,
      type: data.type,
      school: data.school ?? null,
      daily_prompt: data.daily_prompt ?? "",
      daily_prompt_author: data.daily_prompt_author ?? "",
      daily_prompt_updated_at: data.daily_prompt_updated_at ?? "",
      created_at: data.created_at ?? "",
    } as Room;
  } catch {
    return null;
  }
}

// ─── Real-time Room Listener ────────────────────────────────────────

/**
 * Subscribe to a room document for real-time prompt updates.
 * Queries by room_id field, then listens to the matched doc.
 * Returns an unsubscribe function.
 */
export function subscribeToRoom(
  roomId: string,
  onRoomUpdate: (room: Room) => void,
): () => void {
  const q = query(
    collection(db, "rooms"),
    where("room_id", "==", roomId),
    fsLimit(1),
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    if (snapshot.empty) return;
    const d = snapshot.docs[0];
    const data = d.data();
    onRoomUpdate({
      id: d.id,
      room_id: data.room_id,
      name: data.name,
      type: data.type,
      school: data.school ?? null,
      daily_prompt: data.daily_prompt ?? "",
      daily_prompt_author: data.daily_prompt_author ?? "",
      daily_prompt_updated_at: data.daily_prompt_updated_at ?? "",
      created_at: data.created_at ?? "",
    } as Room);
  });

  return unsubscribe;
}

// ─── Messages ────────────────────────────────────────────────────────

/** Fetch recent messages for a room, ordered by newest first */
export async function getMessages(
  roomId: string,
  count = 50,
): Promise<Message[]> {
  try {
    // Equality-only query — sort client-side to avoid composite index
    const q = query(
      collection(db, "messages"),
      where("room_id", "==", roomId),
      fsLimit(count * 2),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          room_id: data.room_id,
          user_id: data.user_id,
          display_name: data.display_name,
          sport: data.sport,
          athlete_status: data.athlete_status,
          content: data.content,
          verified: data.verified === true,
          created_at: data.created_at,
        } as Message;
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, count);
  } catch {
    return [];
  }
}

/** Send a message to a room */
export async function sendMessage(
  roomId: string,
  userId: string,
  displayName: string,
  sport: string,
  athleteStatus: string,
  content: string,
  verified?: boolean,
): Promise<Message> {
  const data = {
    room_id: roomId,
    user_id: userId,
    display_name: displayName,
    sport: sport,
    athlete_status: athleteStatus,
    content: content.trim(),
    verified: verified === true,
    created_at: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, "messages"), data);
  return { id: ref.id, ...data } as Message;
}

// ─── Realtime Subscription ───────────────────────────────────────────

/**
 * Subscribe to new messages via Firestore onSnapshot.
 * Returns an unsubscribe function.
 */
export function subscribeToMessages(
  onNewMessage: (msg: Message) => void,
): () => void {
  // Listen to the entire messages collection for new additions.
  // No orderBy — avoids needing a single-field index on created_at.
  const messagesRef = collection(db, "messages");

  let isFirst = true;
  const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
    // Skip the initial snapshot (existing messages)
    if (isFirst) {
      isFirst = false;
      return;
    }
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const data = change.doc.data();
        const msg: Message = {
          id: change.doc.id,
          room_id: data.room_id,
          user_id: data.user_id,
          display_name: data.display_name,
          sport: data.sport,
          athlete_status: data.athlete_status,
          content: data.content,
          verified: data.verified === true,
          created_at: data.created_at,
        };
        onNewMessage(msg);
      }
    });
  });
  return unsubscribe;
}

// ─── Support Requests ────────────────────────────────────────────────

/** Create a support request */
export async function createSupportRequest(
  userId: string,
  type: "peer" | "moderator",
  message: string,
): Promise<SupportRequest> {
  const data = {
    user_id: userId,
    type,
    message: message.trim(),
    status: "pending" as const,
    created_at: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, "support_requests"), data);
  return { id: ref.id, ...data } as SupportRequest;
}

// ─── Moderation: Reports + Blocks ─────────────────────────────────────

export async function reportMessage(
  reporterId: string,
  message: Pick<Message, "id" | "user_id" | "room_id" | "content">,
  reason: string = "user_reported_from_app",
): Promise<ContentReport> {
  const data = {
    reporter_id: reporterId,
    reported_user_id: message.user_id,
    room_id: message.room_id,
    message_id: message.id,
    content_preview: message.content.slice(0, 240),
    reason,
    created_at: new Date().toISOString(),
    status: "open" as const,
  };

  const ref = await addDoc(collection(db, "content_reports"), data);
  return { id: ref.id, ...data } as ContentReport;
}

export async function blockUser(
  userId: string,
  blockedUserId: string,
): Promise<UserBlock> {
  const blockId = `${userId}_${blockedUserId}`;
  const data = {
    user_id: userId,
    blocked_user_id: blockedUserId,
    created_at: new Date().toISOString(),
  };

  await setDoc(doc(db, "user_blocks", blockId), data, { merge: true });
  return { id: blockId, ...data };
}

export async function getBlockedUserIds(userId: string): Promise<string[]> {
  try {
    const q = query(collection(db, "user_blocks"), where("user_id", "==", userId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data().blocked_user_id as string)
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ─── @Mentions ───────────────────────────────────────────────────────

/**
 * Extract @mentions from a message text.
 * Matches @DisplayName where DisplayName can contain letters, spaces, numbers.
 * Uses the format @FirstName LastName (stops at punctuation or end of string).
 */
export function parseMentions(text: string): string[] {
  const regex = /@([A-Za-z][A-Za-z0-9 ]{1,30}?)(?=[,.\s!?;:]|$)/g;
  const mentions: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    mentions.push(match[1].trim());
  }
  return [...new Set(mentions)]; // deduplicate
}

/**
 * Look up a user's profile by display name.
 * Returns the user_id if found, null otherwise.
 */
export async function getUserIdByDisplayName(
  displayName: string,
): Promise<string | null> {
  try {
    const q = query(
      collection(db, "profiles"),
      where("display_name", "==", displayName),
      fsLimit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data().user_id ?? snap.docs[0].id;
  } catch {
    return null;
  }
}
