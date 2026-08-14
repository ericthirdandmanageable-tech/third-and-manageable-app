import { and, desc, eq, isNull } from "drizzle-orm";

import {
  actionCompletions,
  athleteProfiles,
  checkIns,
  comments,
  forums,
  getDb,
  peerSupportRequests,
  posts,
  techSupportRequests,
  userEmails,
  users,
  verificationRequests,
} from "@/lib/db";

const iso = (value: Date | null | undefined) => value?.toISOString() ?? "";

export async function listAdminUsers() {
  const [rows, pendingRequests] = await Promise.all([
    getDb()
      .select({
        id: users.id,
        displayName: users.displayName,
        email: userEmails.email,
        sport: athleteProfiles.sport,
        status: users.status,
        school: users.school,
        streak: users.streak,
        verified: users.verified,
        verificationRequested: users.verificationRequested,
        createdAt: users.createdAt,
        suspended: users.suspended,
        banned: users.banned,
        chatBanned: users.chatBanned,
      })
      .from(users)
      .leftJoin(
        userEmails,
        and(eq(userEmails.userId, users.id), eq(userEmails.primary, true)),
      )
      .leftJoin(athleteProfiles, eq(athleteProfiles.userId, users.id))
      .where(isNull(users.deletedAt))
      .orderBy(desc(users.createdAt)),
    getDb()
      .select({
        userId: verificationRequests.userId,
        method: verificationRequests.method,
        email: verificationRequests.email,
        reasonCategory: verificationRequests.reasonCategory,
        reason: verificationRequests.reason,
        requestedAt: verificationRequests.requestedAt,
      })
      .from(verificationRequests)
      .where(eq(verificationRequests.status, "pending"))
      .orderBy(desc(verificationRequests.requestedAt)),
  ]);

  const requestByUser = new Map(
    pendingRequests.map((request) => [request.userId, request]),
  );

  return rows.map((row) => {
    const pending = requestByUser.get(row.id);
    return {
      id: row.id,
      display_name: row.displayName || "Unknown",
      email: row.email || "",
      sport: row.sport || "N/A",
      athlete_status: row.status || "N/A",
      school: row.school || "N/A",
      streak: row.streak,
      verified: row.verified,
      verification_requested: row.verificationRequested,
      verification_method: pending?.method ?? null,
      verification_email: pending?.email ?? null,
      verification_reason_category: pending?.reasonCategory ?? null,
      verification_reason: pending?.reason ?? null,
      verification_requested_at: iso(pending?.requestedAt),
      joined_at: iso(row.createdAt),
      suspended: row.suspended,
      banned: row.banned,
      chat_banned: row.chatBanned,
    };
  });
}

export async function listAdminCheckIns() {
  const rows = await getDb()
    .select({
      id: checkIns.id,
      userId: checkIns.userId,
      displayName: users.displayName,
      mood: checkIns.mood,
      journal: checkIns.journal,
      date: checkIns.date,
      createdAt: checkIns.createdAt,
    })
    .from(checkIns)
    .innerJoin(users, eq(users.id, checkIns.userId))
    .orderBy(desc(checkIns.createdAt));

  return rows.map((row) => ({
    id: row.id,
    user_id: row.userId,
    display_name: row.displayName || "Unknown",
    mood: row.mood ?? 3,
    note: row.journal || "",
    date: row.date,
    created_at: iso(row.createdAt),
  }));
}

export async function listAdminActionCompletions() {
  const rows = await getDb()
    .select()
    .from(actionCompletions)
    .orderBy(desc(actionCompletions.completedAt));

  return rows.map((row) => ({
    id: row.id,
    user_id: row.userId,
    action_id: row.actionId,
    date: iso(row.completedAt).slice(0, 10),
    completed_at: iso(row.completedAt),
  }));
}

export async function listAdminSupportRequests() {
  const [peerRows, techRows] = await Promise.all([
    getDb()
      .select({
        id: peerSupportRequests.id,
        userId: peerSupportRequests.userId,
        displayName: users.displayName,
        status: peerSupportRequests.status,
        createdAt: peerSupportRequests.createdAt,
      })
      .from(peerSupportRequests)
      .innerJoin(users, eq(users.id, peerSupportRequests.userId)),
    getDb()
      .select({
        id: techSupportRequests.id,
        userId: techSupportRequests.userId,
        displayName: users.displayName,
        message: techSupportRequests.message,
        status: techSupportRequests.status,
        createdAt: techSupportRequests.createdAt,
      })
      .from(techSupportRequests)
      .innerJoin(users, eq(users.id, techSupportRequests.userId)),
  ]);

  return [
    ...peerRows.map((row) => ({
      id: row.id,
      user_id: row.userId,
      display_name: row.displayName || "Unknown User",
      type: "peer",
      message: "Peer support connection requested",
      status: row.status === "notified" ? "pending" : row.status,
      created_at: iso(row.createdAt),
    })),
    ...techRows.map((row) => ({
      id: row.id,
      user_id: row.userId,
      display_name: row.displayName || "Unknown User",
      type: "tech",
      message: row.message,
      status: row.status === "open" ? "pending" : row.status,
      created_at: iso(row.createdAt),
    })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getAdminCommunityData() {
  const [forumRows, postRows, commentRows] = await Promise.all([
    getDb().select().from(forums).orderBy(forums.title),
    getDb()
      .select({
        id: posts.id,
        forumId: posts.forumId,
        authorId: posts.authorId,
        authorName: posts.authorName,
        body: posts.body,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(isNull(posts.deletedAt))
      .orderBy(desc(posts.createdAt)),
    getDb()
      .select({
        id: comments.id,
        forumId: posts.forumId,
        authorId: comments.authorId,
        authorName: comments.authorName,
        body: comments.body,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .innerJoin(posts, eq(posts.id, comments.postId))
      .where(and(isNull(comments.deletedAt), isNull(posts.deletedAt)))
      .orderBy(desc(comments.createdAt)),
  ]);
  const counts = new Map<string, number>();
  for (const post of postRows) {
    counts.set(post.forumId, (counts.get(post.forumId) || 0) + 1);
  }
  for (const comment of commentRows) {
    counts.set(comment.forumId, (counts.get(comment.forumId) || 0) + 1);
  }

  const messages = [...postRows, ...commentRows].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  return {
    rooms: forumRows.map((forum) => ({
      id: forum.id,
      room_id: forum.id,
      name: forum.title,
      type: forum.category.toLowerCase(),
      messageCount: counts.get(forum.id) || 0,
      daily_prompt: forum.dailyPrompt || "",
      daily_prompt_author: forum.dailyPromptAuthor || "",
      daily_prompt_updated_at: iso(forum.dailyPromptUpdatedAt),
    })),
    recentMessages: messages.slice(0, 50).map((message) => ({
      id: message.id,
      room_id: message.forumId,
      user_id: message.authorId,
      display_name: message.authorName,
      sport: "",
      content: message.body,
      created_at: iso(message.createdAt),
    })),
    totalMessages: messages.length,
  };
}
