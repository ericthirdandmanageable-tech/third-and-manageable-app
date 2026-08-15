import { randomUUID } from "node:crypto";

import { getForum } from "@/lib/core/community";
import { getAdminFirestore } from "@/lib/firebase-admin";
import {
  isoNow,
  listAllDocuments,
  listUserDocuments,
  stableDocumentId,
} from "@/lib/firestore-product";

export function timeAgo(createdAt: Date | string, now = new Date()): string {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const milliseconds = Math.max(now.getTime() - created.getTime(), 0);
  const days = Math.floor(milliseconds / 86_400_000);
  if (days > 0) return `${days}d`;
  const hours = Math.floor(milliseconds / 3_600_000);
  if (hours > 0) return `${hours}h`;
  return `${Math.max(Math.floor(milliseconds / 60_000), 1)}m`;
}

export interface PostRow {
  id: string;
  forumId: string;
  authorId: string;
  authorName: string;
  flair: string;
  title: string;
  body: string;
  upvotes: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  commentCount: number;
}

interface StoredPost {
  forum_id: string;
  author_id: string;
  author_name: string;
  flair: string;
  title: string;
  body: string;
  upvotes?: number;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
}

interface StoredComment {
  post_id: string;
  author_id: string;
  author_name: string;
  parent_id?: string | null;
  body: string;
  upvotes?: number;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export function postJson(post: PostRow) {
  return {
    id: post.id,
    forum_id: post.forumId,
    author_name: post.authorName,
    flair: post.flair,
    title: post.title,
    body: post.body,
    upvotes: post.upvotes,
    comment_count: post.commentCount,
    time_ago: timeAgo(post.createdAt),
  };
}

function postRow(post: StoredPost & { id: string }, commentCount = 0): PostRow {
  return {
    id: post.id,
    forumId: post.forum_id,
    authorId: post.author_id,
    authorName: post.author_name,
    flair: post.flair,
    title: post.title,
    body: post.body,
    upvotes: post.upvotes ?? 0,
    createdAt: post.created_at,
    updatedAt: post.updated_at ?? post.created_at,
    deletedAt: post.deleted_at ?? null,
    commentCount,
  };
}

export async function listPostRows(options: {
  forumId?: string;
  userId?: string;
  scope?: "joined" | "all";
  sort?: "hot" | "new" | "top";
}): Promise<PostRow[]> {
  const [storedPosts, storedComments, memberships] = await Promise.all([
    listAllDocuments<StoredPost>("posts"),
    listAllDocuments<StoredComment>("comments"),
    options.scope === "joined" && options.userId
      ? listUserDocuments<{ forum_id: string }>("forum_memberships", options.userId, 200)
      : Promise.resolve([]),
  ]);
  const joined = new Set(memberships.map((membership) => membership.forum_id));
  const commentCounts = new Map<string, number>();
  for (const comment of storedComments) {
    if (!comment.deleted_at) {
      commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) ?? 0) + 1);
    }
  }
  const output = storedPosts
    .filter((post) => !post.deleted_at)
    .filter((post) => !options.forumId || post.forum_id === options.forumId)
    .filter((post) => options.scope !== "joined" || joined.has(post.forum_id))
    .map((post) => postRow(post, commentCounts.get(post.id) ?? 0));
  if (options.sort === "new") return output.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (options.sort === "top") {
    return output.sort((a, b) => b.upvotes - a.upvotes || b.createdAt.localeCompare(a.createdAt));
  }
  return output.sort((a, b) => {
    const hot = (post: PostRow) => {
      const ageHours = Math.max((Date.now() - new Date(post.createdAt).getTime()) / 3_600_000, 0);
      return (post.upvotes + post.commentCount * 2 + 1) / ((ageHours + 2) ** 1.5);
    };
    return hot(b) - hot(a);
  });
}

export interface CommentJson {
  id: string;
  author_name: string;
  body: string;
  upvotes: number;
  time_ago: string;
  replies: CommentJson[];
}

export async function commentsForPost(postId: string): Promise<CommentJson[]> {
  const rows = (await listAllDocuments<StoredComment>("comments"))
    .filter((row) => row.post_id === postId && !row.deleted_at)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const byParent = new Map<string | null, typeof rows>();
  for (const row of rows) {
    const parentId = row.parent_id ?? null;
    const group = byParent.get(parentId) ?? [];
    group.push(row);
    byParent.set(parentId, group);
  }
  const build = (parentId: string | null): CommentJson[] =>
    (byParent.get(parentId) ?? []).map((row) => ({
      id: row.id,
      author_name: row.author_name,
      body: row.body,
      upvotes: row.upvotes ?? 0,
      time_ago: timeAgo(row.created_at),
      replies: build(row.id),
    }));
  return build(null);
}

export async function createForumPost(input: {
  forumId: string;
  authorId: string;
  authorName: string;
  flair: string;
  title: string;
  body: string;
}): Promise<PostRow> {
  if (!getForum(input.forumId)) throw new Error("Forum not found");
  const database = getAdminFirestore();
  const post = database.collection("posts").doc(randomUUID());
  const membership = database
    .collection("forum_memberships")
    .doc(stableDocumentId(input.authorId, input.forumId));
  const now = isoNow();
  const batch = database.batch();
  batch.set(membership, {
    user_id: input.authorId,
    forum_id: input.forumId,
    joined_at: now,
  });
  batch.create(post, {
    forum_id: input.forumId,
    author_id: input.authorId,
    author_name: input.authorName,
    flair: input.flair,
    title: input.title,
    body: input.body,
    upvotes: 0,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });
  await batch.commit();
  return postRow({ id: post.id, forum_id: input.forumId, author_id: input.authorId, author_name: input.authorName, flair: input.flair, title: input.title, body: input.body, upvotes: 0, created_at: now, updated_at: now, deleted_at: null });
}

export async function setForumMembership(
  userId: string,
  forumId: string,
  joined: boolean,
): Promise<number> {
  if (!getForum(forumId)) throw new Error("Forum not found");
  const database = getAdminFirestore();
  const reference = database
    .collection("forum_memberships")
    .doc(stableDocumentId(userId, forumId));
  if (joined) {
    await reference.set({ user_id: userId, forum_id: forumId, joined_at: isoNow() });
  } else {
    await reference.delete();
  }
  const count = await database
    .collection("forum_memberships")
    .where("forum_id", "==", forumId)
    .count()
    .get();
  return count.data().count;
}

export async function createForumComment(input: {
  postId: string;
  authorId: string;
  authorName: string;
  parentId: string | null;
  body: string;
}): Promise<CommentJson | null> {
  const database = getAdminFirestore();
  const post = await database.collection("posts").doc(input.postId).get();
  if (!post.exists || post.data()?.deleted_at) return null;
  if (input.parentId) {
    const parent = await database.collection("comments").doc(input.parentId).get();
    if (!parent.exists || parent.data()?.post_id !== input.postId || parent.data()?.deleted_at) {
      throw new Error("Invalid parent comment");
    }
  }
  const now = isoNow();
  const reference = database.collection("comments").doc(randomUUID());
  await reference.create({
    post_id: input.postId,
    author_id: input.authorId,
    author_name: input.authorName,
    parent_id: input.parentId,
    body: input.body,
    upvotes: 0,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });
  return {
    id: reference.id,
    author_name: input.authorName,
    body: input.body,
    upvotes: 0,
    time_ago: "just now",
    replies: [],
  };
}

export async function toggleCommunityVote(input: {
  userId: string;
  targetType: "post" | "comment";
  targetId: string;
}): Promise<{ upvotes: number; voted: boolean } | null> {
  const database = getAdminFirestore();
  const target = database.collection(input.targetType === "post" ? "posts" : "comments").doc(input.targetId);
  const vote = database
    .collection(input.targetType === "post" ? "post_votes" : "comment_votes")
    .doc(stableDocumentId(input.userId, input.targetId));
  return database.runTransaction(async (transaction) => {
    const [targetSnapshot, voteSnapshot] = await Promise.all([
      transaction.get(target),
      transaction.get(vote),
    ]);
    if (!targetSnapshot.exists || targetSnapshot.data()?.deleted_at) return null;
    const current = Number(targetSnapshot.data()?.upvotes ?? 0);
    const upvotes = voteSnapshot.exists ? Math.max(current - 1, 0) : current + 1;
    if (voteSnapshot.exists) transaction.delete(vote);
    else transaction.create(vote, { user_id: input.userId, target_id: input.targetId, value: 1, created_at: isoNow() });
    transaction.update(target, { upvotes, updated_at: isoNow() });
    return { upvotes, voted: !voteSnapshot.exists };
  });
}
