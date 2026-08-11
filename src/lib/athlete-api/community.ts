import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { comments, forumMemberships, posts } from "@/lib/db/schema";

export function timeAgo(createdAt: Date, now = new Date()): string {
    const milliseconds = Math.max(now.getTime() - createdAt.getTime(), 0);
    const days = Math.floor(milliseconds / 86_400_000);
    if (days > 0) return `${days}d`;
    const hours = Math.floor(milliseconds / 3_600_000);
    if (hours > 0) return `${hours}h`;
    return `${Math.max(Math.floor(milliseconds / 60_000), 1)}m`;
}

export type PostRow = typeof posts.$inferSelect & { commentCount: number };

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

export async function listPostRows(options: {
    forumId?: string;
    userId?: string;
    scope?: "joined" | "all";
    sort?: "hot" | "new" | "top";
}): Promise<PostRow[]> {
    const db = getDb();
    const filters = [isNull(posts.deletedAt)];
    if (options.forumId) filters.push(eq(posts.forumId, options.forumId));
    if (options.scope === "joined" && options.userId) {
        const joined = db.select({ forumId: forumMemberships.forumId })
            .from(forumMemberships).where(eq(forumMemberships.userId, options.userId));
        filters.push(sql`${posts.forumId} in ${joined}`);
    }
    const rows = await db.select({
        post: posts,
        commentCount: sql<number>`count(${comments.id})::int`,
    }).from(posts).leftJoin(comments, and(
        eq(comments.postId, posts.id),
        isNull(comments.deletedAt),
    )).where(and(...filters)).groupBy(posts.id);
    const output = rows.map((row) => ({ ...row.post, commentCount: row.commentCount }));
    if (options.sort === "new") return output.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    if (options.sort === "top") return output.sort((a, b) => b.upvotes - a.upvotes || b.createdAt.getTime() - a.createdAt.getTime());
    return output.sort((a, b) => {
        const hot = (post: PostRow) => {
            const ageHours = Math.max((Date.now() - post.createdAt.getTime()) / 3_600_000, 0);
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
    const rows = await getDb().select().from(comments).where(and(
        eq(comments.postId, postId),
        isNull(comments.deletedAt),
    )).orderBy(asc(comments.createdAt));
    const byParent = new Map<string | null, typeof rows>();
    for (const row of rows) {
        const group = byParent.get(row.parentId) ?? [];
        group.push(row);
        byParent.set(row.parentId, group);
    }
    const build = (parentId: string | null): CommentJson[] =>
        (byParent.get(parentId) ?? []).map((row) => ({
            id: row.id,
            author_name: row.authorName,
            body: row.body,
            upvotes: row.upvotes,
            time_ago: timeAgo(row.createdAt),
            replies: build(row.id),
        }));
    return build(null);
}
