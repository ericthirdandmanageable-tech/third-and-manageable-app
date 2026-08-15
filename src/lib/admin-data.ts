import { FORUMS } from "@/lib/core/community";
import {
  listAllDocuments,
  type ProductCheckIn,
  type ProductCompletion,
  type ProductProfile,
} from "@/lib/firestore-product";

interface VerificationRequest {
  user_id: string;
  method: "university_email" | "manual";
  status: string;
  email?: string | null;
  reason_category?: string | null;
  reason?: string | null;
  requested_at: string;
}

export async function listAdminUsers() {
  const [profiles, requests] = await Promise.all([
    listAllDocuments<ProductProfile>("profiles"),
    listAllDocuments<VerificationRequest>("verification_requests"),
  ]);
  const pending = new Map(
    requests
      .filter((request) => request.status === "pending")
      .map((request) => [request.user_id, request]),
  );
  return profiles
    .filter((profile) => !profile.deleted_at)
    .sort((a, b) => String(b.joined_at ?? "").localeCompare(String(a.joined_at ?? "")))
    .map((profile) => {
      const request = pending.get(profile.id);
      return {
        id: profile.id,
        display_name: profile.display_name || "Unknown",
        email: profile.email || "",
        sport: profile.sport || "N/A",
        athlete_status: profile.transition_status || profile.athlete_status || "N/A",
        school: profile.school || "N/A",
        streak: profile.streak ?? 0,
        verified: profile.verified === true,
        verification_requested: profile.verification_requested === true,
        verification_method: request?.method ?? null,
        verification_email: request?.email ?? null,
        verification_reason_category: request?.reason_category ?? null,
        verification_reason: request?.reason ?? null,
        verification_requested_at: request?.requested_at ?? "",
        joined_at: profile.joined_at ?? "",
        suspended: profile.suspended === true,
        banned: profile.banned === true,
        chat_banned: profile.chat_banned === true,
      };
    });
}

export async function listAdminCheckIns() {
  const [rows, profiles] = await Promise.all([
    listAllDocuments<ProductCheckIn>("checkins"),
    listAllDocuments<ProductProfile>("profiles"),
  ]);
  const names = new Map(profiles.map((profile) => [profile.id, profile.display_name || "Unknown"]));
  return rows
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .map((row) => ({
      id: row.id,
      user_id: row.user_id,
      display_name: names.get(row.user_id) || "Unknown",
      mood: row.mood ?? 3,
      note: row.journal || row.note || "",
      date: row.date,
      created_at: row.created_at || "",
    }));
}

export async function listAdminActionCompletions() {
  const rows = await listAllDocuments<ProductCompletion>("completions");
  return rows
    .sort((a, b) => String(b.completed_at ?? "").localeCompare(String(a.completed_at ?? "")))
    .map((row) => ({
      id: row.id,
      user_id: row.user_id,
      action_id: row.action_id,
      date: row.date || row.completed_at.slice(0, 10),
      completed_at: row.completed_at,
    }));
}

export async function listAdminSupportRequests() {
  const [rows, profiles] = await Promise.all([
    listAllDocuments<{
      user_id: string;
      type: string;
      message?: string;
      status: string;
      created_at: string;
    }>("support_requests"),
    listAllDocuments<ProductProfile>("profiles"),
  ]);
  const names = new Map(profiles.map((profile) => [profile.id, profile.display_name || "Unknown User"]));
  return rows
    .map((row) => ({
      id: row.id,
      user_id: row.user_id,
      display_name: names.get(row.user_id) || "Unknown User",
      type: row.type === "peer" ? "peer" : "tech",
      message: row.message || "Peer support connection requested",
      status: row.status,
      created_at: row.created_at,
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getAdminCommunityData() {
  const [roomRows, postRows, commentRows, messageRows] = await Promise.all([
    listAllDocuments<{ room_id: string; name?: string; type?: string; daily_prompt?: string; daily_prompt_author?: string; daily_prompt_updated_at?: string }>("rooms"),
    listAllDocuments<{ forum_id: string; author_id: string; author_name: string; body: string; created_at: string; deleted_at?: string | null }>("posts"),
    listAllDocuments<{ post_id: string; author_id: string; author_name: string; body: string; created_at: string; deleted_at?: string | null }>("comments"),
    listAllDocuments<{ room_id: string; user_id: string; display_name: string; sport?: string; content: string; created_at: string }>("messages"),
  ]);
  const roomOverrides = new Map(roomRows.map((room) => [room.room_id || room.id, room]));
  const postForum = new Map(postRows.map((post) => [post.id, post.forum_id]));
  const messages = [
    ...postRows.filter((post) => !post.deleted_at).map((post) => ({
      id: post.id,
      room_id: post.forum_id,
      user_id: post.author_id,
      display_name: post.author_name,
      sport: "",
      content: post.body,
      created_at: post.created_at,
    })),
    ...commentRows.filter((comment) => !comment.deleted_at).map((comment) => ({
      id: comment.id,
      room_id: postForum.get(comment.post_id) || "unknown",
      user_id: comment.author_id,
      display_name: comment.author_name,
      sport: "",
      content: comment.body,
      created_at: comment.created_at,
    })),
    ...messageRows.map((message) => ({ ...message, sport: message.sport || "" })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const counts = new Map<string, number>();
  for (const message of messages) counts.set(message.room_id, (counts.get(message.room_id) ?? 0) + 1);
  const roomIds = new Set([...FORUMS.map((forum) => forum.id), ...roomOverrides.keys()]);
  return {
    rooms: [...roomIds].map((id) => {
      const catalog = FORUMS.find((forum) => forum.id === id);
      const override = roomOverrides.get(id);
      return {
        id,
        room_id: id,
        name: override?.name || catalog?.title || id,
        type: override?.type || catalog?.category.toLowerCase() || "global",
        messageCount: counts.get(id) || 0,
        daily_prompt: override?.daily_prompt || "",
        daily_prompt_author: override?.daily_prompt_author || "",
        daily_prompt_updated_at: override?.daily_prompt_updated_at || "",
      };
    }),
    recentMessages: messages.slice(0, 50),
    totalMessages: messages.length,
  };
}
