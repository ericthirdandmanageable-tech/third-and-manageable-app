import { and, eq, sql } from "drizzle-orm";

import { requireVerifiedUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError } from "@/lib/athlete-api/http";
import { getDb } from "@/lib/db";
import { forumMemberships, forums } from "@/lib/db/schema";

async function membership(
    request: Request,
    params: Promise<{ forum_id: string }>,
    joined: boolean,
) {
    const user = await requireVerifiedUser(request);
    const { forum_id: forumId } = await params;
    const [forum] = await getDb().select({ id: forums.id }).from(forums).where(eq(forums.id, forumId)).limit(1);
    if (!forum) throw new ApiError(404, "Forum not found");
    if (joined) {
        await getDb().insert(forumMemberships).values({ userId: user.id, forumId }).onConflictDoNothing();
    } else {
        await getDb().delete(forumMemberships).where(and(
            eq(forumMemberships.userId, user.id),
            eq(forumMemberships.forumId, forumId),
        ));
    }
    const [count] = await getDb().select({ value: sql<number>`count(*)::int` })
        .from(forumMemberships).where(eq(forumMemberships.forumId, forumId));
    return Response.json({ forum_id: forumId, joined, member_count: count.value });
}

export async function POST(request: Request, context: { params: Promise<{ forum_id: string }> }) {
    try { return await membership(request, context.params, true); } catch (error) { return jsonError(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ forum_id: string }> }) {
    try { return await membership(request, context.params, false); } catch (error) { return jsonError(error); }
}
