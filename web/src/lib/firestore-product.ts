import { createHash, randomUUID } from "node:crypto";

import type {
  DocumentData,
  DocumentSnapshot,
  Query,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";

import { getAdminFirestore } from "@/lib/firebase-admin";
import { universitySelectionChanged } from "@/lib/core/university-search";

export interface ProductProfile extends DocumentData {
  user_id: string;
  email?: string;
  display_name?: string;
  school?: string | null;
  school_id?: string | null;
  sport?: string;
  athlete_status?: string;
  transition_status?: string;
  headline?: string | null;
  verified?: boolean;
  verification_requested?: boolean;
  verification_requested_at?: string | null;
  suspended?: boolean;
  suspended_at?: string | null;
  banned?: boolean;
  banned_at?: string | null;
  chat_banned?: boolean;
  chat_banned_at?: string | null;
  deleted_at?: string | null;
  joined_at?: string;
  updated_at?: string;
  intake_done?: boolean;
  intake_answers?: Record<string, string>;
  skill_map?: unknown[];
  committed_path_id?: string | null;
  streak?: number;
}

export interface ProductCheckIn extends DocumentData {
  id: string;
  user_id: string;
  date: string;
  prompt_id: string;
  prompt_question: string;
  option: string;
  journal: string | null;
  mood: number;
  note: string;
  ai_response: string;
  created_at: string;
  updated_at: string;
}

export const isoNow = () => new Date().toISOString();

export type ProductNotificationType =
  | "checkin"
  | "streak"
  | "gameplan"
  | "milestone"
  | "welcome"
  | "mention";

export interface ProductNotification extends DocumentData {
  id: string;
  user_id: string;
  type: ProductNotificationType;
  title: string;
  body: string;
  icon: string;
  timestamp: string;
  read: boolean;
  related_id?: string;
}

export async function createProductNotification(
  userId: string,
  values: Pick<ProductNotification, "type" | "title" | "body" | "icon"> &
    Partial<Pick<ProductNotification, "related_id">>,
): Promise<ProductNotification> {
  const reference = getAdminFirestore().collection("notifications").doc(randomUUID());
  const notification = {
    user_id: userId,
    ...values,
    timestamp: isoNow(),
    read: false,
  };
  await reference.create(notification);
  return { id: reference.id, ...notification } as ProductNotification;
}

export async function listProductNotifications(
  userId: string,
  maximum = 50,
): Promise<ProductNotification[]> {
  const rows = await listUserDocuments<ProductNotification>(
    "notifications",
    userId,
    Math.min(Math.max(maximum * 2, 1), 200),
  );
  return rows
    .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))
    .slice(0, maximum);
}

export async function markProductNotificationRead(
  userId: string,
  notificationId?: string,
): Promise<number> {
  const database = getAdminFirestore();
  if (notificationId) {
    const reference = database.collection("notifications").doc(notificationId);
    const snapshot = await reference.get();
    if (!snapshot.exists || snapshot.data()?.user_id !== userId) return 0;
    if (snapshot.data()?.read !== true) await reference.update({ read: true });
    return 1;
  }

  const unread = (await listUserDocuments<ProductNotification>("notifications", userId, 500))
    .filter((notification) => notification.read !== true);
  if (unread.length === 0) return 0;
  const batch = database.batch();
  unread.forEach((notification) => {
    batch.update(database.collection("notifications").doc(notification.id), { read: true });
  });
  await batch.commit();
  return unread.length;
}

export function snapshotData<T extends DocumentData>(
  snapshot: DocumentSnapshot | QueryDocumentSnapshot,
): (T & { id: string }) | null {
  if (!snapshot.exists) return null;
  return { id: snapshot.id, ...(snapshot.data() as T) };
}

export async function getProductProfile(userId: string): Promise<ProductProfile | null> {
  const snapshot = await getAdminFirestore().collection("profiles").doc(userId).get();
  return snapshot.exists ? (snapshot.data() as ProductProfile) : null;
}

export async function ensureProductProfile(input: {
  userId: string;
  email?: string | null;
  displayName?: string | null;
  school?: string | null;
  transitionStatus?: string | null;
}): Promise<ProductProfile> {
  const reference = getAdminFirestore().collection("profiles").doc(input.userId);
  const existing = await reference.get();
  if (existing.exists) return existing.data() as ProductProfile;

  const now = isoNow();
  const transitionStatus = input.transitionStatus || "transitioning";
  const profile: ProductProfile = {
    user_id: input.userId,
    display_name: input.displayName || "Athlete",
    school: input.school || null,
    athlete_status: transitionStatus === "competing" ? "current" : "former",
    transition_status: transitionStatus,
    verified: false,
    verification_requested: false,
    suspended: false,
    banned: false,
    chat_banned: false,
    joined_at: now,
    updated_at: now,
    intake_done: false,
    intake_answers: {},
    skill_map: [],
    committed_path_id: null,
    streak: 0,
  };
  if (input.email) profile.email = input.email;
  await reference.set(profile);
  return profile;
}

export async function updateProductProfile(
  userId: string,
  values: Partial<ProductProfile>,
): Promise<ProductProfile | null> {
  const reference = getAdminFirestore().collection("profiles").doc(userId);
  const existing = await reference.get();
  if (!existing.exists) return null;
  await reference.set({ ...values, updated_at: isoNow() }, { merge: true });
  return (await reference.get()).data() as ProductProfile;
}

/**
 * Applies athlete-editable profile fields and revokes school-backed verification
 * in the same transaction when the selected school changes. Pending requests are
 * cancelled so a link issued for the previous school cannot verify the new one.
 */
export async function updateProductProfileFromAthlete(
  userId: string,
  values: Partial<ProductProfile>,
): Promise<ProductProfile | null> {
  const database = getAdminFirestore();
  const profileReference = database.collection("profiles").doc(userId);
  const pendingRequests = database
    .collection("verification_requests")
    .where("user_id", "==", userId)
    .limit(20);

  const result = await database.runTransaction(async (transaction) => {
    const existing = await transaction.get(profileReference);
    if (!existing.exists) return null;

    const current = existing.data() as ProductProfile;
    const schoolChanged =
      values.school !== undefined && universitySelectionChanged(current.school, values.school);
    const now = isoNow();
    const nextValues: Partial<ProductProfile> = { ...values, updated_at: now };

    if (schoolChanged) {
      const requests = await transaction.get(pendingRequests);
      for (const request of requests.docs) {
        if (request.data().status === "pending") {
          transaction.update(request.ref, { status: "cancelled", resolved_at: now });
        }
      }
      Object.assign(nextValues, {
        verified: false,
        verification_requested: false,
        verification_requested_at: null,
        university_email: null,
        university_email_normalized: null,
      });
    }

    transaction.set(profileReference, nextValues, { merge: true });
    return { ...current, ...nextValues } as ProductProfile;
  });

  return result;
}

export async function listUserDocuments<T extends DocumentData>(
  collectionName: string,
  userId: string,
  maximum = 200,
): Promise<Array<T & { id: string }>> {
  const snapshot = await getAdminFirestore()
    .collection(collectionName)
    .where("user_id", "==", userId)
    .limit(maximum)
    .get();
  return snapshot.docs.map((document) => ({ id: document.id, ...(document.data() as T) }));
}

export async function listAllDocuments<T extends DocumentData>(
  collectionName: string,
  maximum = 1_000,
): Promise<Array<T & { id: string }>> {
  const snapshot = await getAdminFirestore().collection(collectionName).limit(maximum).get();
  return snapshot.docs.map((document) => ({ id: document.id, ...(document.data() as T) }));
}

export async function listCheckIns(userId: string): Promise<ProductCheckIn[]> {
  const rows = await listUserDocuments<ProductCheckIn>("checkins", userId, 180);
  return rows
    .map((row) => ({
      ...row,
      prompt_id: row.prompt_id || "mobile-mood",
      prompt_question: row.prompt_question || "How are you feeling today?",
      option: row.option || String(row.mood ?? 3),
      journal: row.journal ?? row.note ?? null,
      mood: row.mood ?? 3,
      note: row.note ?? row.journal ?? "",
      ai_response: row.ai_response ?? "",
      created_at: row.created_at || `${row.date}T00:00:00.000Z`,
      updated_at: row.updated_at || row.created_at || `${row.date}T00:00:00.000Z`,
    }) as ProductCheckIn)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function createCheckIn(
  userId: string,
  values: Pick<
    ProductCheckIn,
    "date" | "prompt_id" | "prompt_question" | "option" | "journal"
  > &
    Partial<Pick<ProductCheckIn, "ai_response" | "mood">>,
): Promise<ProductCheckIn | null> {
  const database = getAdminFirestore();
  const reference = database.collection("checkins").doc(`${userId}_${values.date}`);
  const profileReference = database.collection("profiles").doc(userId);
  const now = isoNow();
  const persisted = {
    user_id: userId,
    ...values,
    mood: values.mood ?? (Number(values.option) || 3),
    note: values.journal || "",
    ai_response: values.ai_response || "",
    created_at: now,
    updated_at: now,
  };
  const created: ProductCheckIn = { id: reference.id, ...persisted };
  try {
    return await database.runTransaction(async (transaction) => {
      const [existing, profile] = await Promise.all([
        transaction.get(reference),
        transaction.get(profileReference),
      ]);
      if (existing.exists) return null;

      transaction.create(reference, persisted);
      if (profile.exists) {
        const profileData = profile.data() as ProductProfile;
        const lastDate = profileData.last_checkin_date || "";
        const yesterday = new Date(`${values.date}T12:00:00.000Z`);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const nextStreak =
          lastDate === yesterday.toISOString().slice(0, 10)
            ? (typeof profileData.streak === "number" ? profileData.streak : 0) + 1
            : 1;
        transaction.update(profileReference, {
          last_checkin_date: values.date,
          streak: nextStreak,
          updated_at: now,
        });
      }
      return created;
    });
  } catch (error) {
    const code = (error as { code?: number | string })?.code;
    if (code === 6 || code === "already-exists") return null;
    throw error;
  }
}

export async function updateCheckIn(
  userId: string,
  date: string,
  values: { option?: string; journal?: string | null },
): Promise<ProductCheckIn | null> {
  const reference = getAdminFirestore().collection("checkins").doc(`${userId}_${date}`);
  const existing = await reference.get();
  if (!existing.exists) return null;
  const patch: DocumentData = { updated_at: isoNow() };
  if (values.option !== undefined) patch.option = values.option;
  if (values.journal !== undefined) {
    patch.journal = values.journal;
    patch.note = values.journal || "";
  }
  await reference.update(patch);
  return (await listCheckIns(userId)).find((row) => row.id === reference.id) ?? null;
}

export interface ProductCompletion extends DocumentData {
  id: string;
  user_id: string;
  action_id: string;
  date: string;
  week_of: string;
  category: string;
  completed_at: string;
}

export async function listCompletions(userId: string): Promise<ProductCompletion[]> {
  const rows = await listUserDocuments<ProductCompletion>(
    "completions",
    userId,
    500,
  );
  return rows.sort((a, b) => b.completed_at.localeCompare(a.completed_at));
}

export async function toggleCompletion(input: {
  userId: string;
  actionId: string;
  weekOf: string;
  category: string;
}): Promise<boolean> {
  const database = getAdminFirestore();
  const reference = database
    .collection("completions")
    .doc(stableDocumentId(input.userId, input.weekOf, input.actionId));

  return database.runTransaction(async (transaction) => {
    const existing = await transaction.get(reference);
    if (existing.exists) {
      transaction.delete(reference);
      return false;
    }

    const now = isoNow();
    transaction.create(reference, {
      user_id: input.userId,
      action_id: input.actionId,
      date: now.slice(0, 10),
      week_of: input.weekOf,
      category: input.category,
      completed_at: now,
    });
    return true;
  });
}

export interface ClipboardMessage extends DocumentData {
  id: string;
  role: "user" | "assistant";
  content: string;
  text: string;
  persona: string;
  created_at: string;
}

function clipboardSessionId(userId: string, date = isoNow().slice(0, 10)): string {
  return `${userId}_${date}`;
}

export async function appendClipboardMessage(input: {
  userId: string;
  role: ClipboardMessage["role"];
  text: string;
  persona: string;
}): Promise<ClipboardMessage> {
  const database = getAdminFirestore();
  const sessionId = clipboardSessionId(input.userId);
  const session = database.collection("ai_chat_sessions").doc(sessionId);
  const message = session.collection("messages").doc();
  const now = isoNow();

  await database.runTransaction(async (transaction) => {
    const existing = await transaction.get(session);
    transaction.set(
      session,
      {
        user_id: input.userId,
        date: now.slice(0, 10),
        message_count: (existing.data()?.message_count ?? 0) + 1,
        created_at: existing.data()?.created_at ?? now,
        updated_at: now,
      },
      { merge: true },
    );
    transaction.create(message, {
      role: input.role,
      content: input.text,
      text: input.text,
      persona: input.persona,
      created_at: now,
    });
  });

  return {
    id: message.id,
    role: input.role,
    content: input.text,
    text: input.text,
    persona: input.persona,
    created_at: now,
  };
}

export async function listClipboardMessages(userId: string): Promise<ClipboardMessage[]> {
  const database = getAdminFirestore();
  const sessions = await database
    .collection("ai_chat_sessions")
    .where("user_id", "==", userId)
    .limit(90)
    .get();
  const snapshots = await Promise.all(
    sessions.docs.map((session) => session.ref.collection("messages").limit(500).get()),
  );
  return snapshots
    .flatMap((snapshot) =>
      snapshot.docs.map((message) => {
        const data = message.data();
        const text = String(data.text ?? data.content ?? "");
        return {
          id: message.id,
          role: data.role === "assistant" || data.role === "ai" ? "assistant" : "user",
          content: text,
          text,
          persona: String(data.persona ?? "friend"),
          created_at: String(data.created_at ?? ""),
        } satisfies ClipboardMessage;
      }),
    )
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function clearClipboardMessages(userId: string): Promise<number> {
  const database = getAdminFirestore();
  const sessions = await database
    .collection("ai_chat_sessions")
    .where("user_id", "==", userId)
    .limit(90)
    .get();
  let removed = 0;
  for (const session of sessions.docs) {
    const messages = await session.ref.collection("messages").limit(500).get();
    const batch = database.batch();
    for (const message of messages.docs) {
      batch.delete(message.ref);
      removed += 1;
    }
    batch.delete(session.ref);
    await batch.commit();
  }
  return removed;
}

async function deleteQueryDocuments(
  query: Query,
): Promise<number> {
  const database = getAdminFirestore();
  let removed = 0;
  while (true) {
    const snapshot = await query.limit(400).get();
    if (snapshot.empty) return removed;
    const batch = database.batch();
    for (const document of snapshot.docs) {
      batch.delete(document.ref);
      removed += 1;
    }
    await batch.commit();
  }
}

export async function deleteProductDataForUser(userId: string): Promise<number> {
  const database = getAdminFirestore();
  let removed = await clearClipboardMessages(userId);
  for (const collectionName of [
    "checkins",
    "completions",
    "messages",
    "support_requests",
    "notifications",
    "forum_memberships",
    "post_votes",
    "comment_votes",
  ]) {
    removed += await deleteQueryDocuments(
      database.collection(collectionName).where("user_id", "==", userId),
    );
  }
  for (const collectionName of ["posts", "comments"]) {
    removed += await deleteQueryDocuments(
      database.collection(collectionName).where("author_id", "==", userId),
    );
  }
  removed += await deleteQueryDocuments(
    database.collection("content_reports").where("reporter_id", "==", userId),
  );
  removed += await deleteQueryDocuments(
    database.collection("content_reports").where("reported_user_id", "==", userId),
  );
  removed += await deleteQueryDocuments(
    database.collection("user_blocks").where("user_id", "==", userId),
  );
  removed += await deleteQueryDocuments(
    database.collection("user_blocks").where("blocked_user_id", "==", userId),
  );
  const directReferences = [
    database.collection("profiles").doc(userId),
    database.collection("push_tokens").doc(userId),
    database.collection("auth_identity_mappings").doc(userId),
  ];
  const batch = database.batch();
  for (const reference of directReferences) batch.delete(reference);
  await batch.commit();
  return removed + directReferences.length;
}

export function stableDocumentId(...parts: string[]): string {
  return createHash("sha256").update(parts.join("\u0000")).digest("hex");
}

export async function appendAuditEvent(input: {
  action: string;
  targetType: string;
  targetId: string;
  requestId: string;
  outcome: "succeeded" | "denied" | "failed";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await getAdminFirestore().collection("admin_audit_logs").doc(randomUUID()).create({
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId,
    request_id: input.requestId,
    outcome: input.outcome,
    metadata: input.metadata ?? {},
    created_at: isoNow(),
  });
}
