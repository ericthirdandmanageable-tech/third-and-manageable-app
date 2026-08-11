import { and, eq, isNull, sql } from "drizzle-orm";

import { requireVerifiedUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, stringField, uuidField } from "@/lib/athlete-api/http";
import { comments, commentVotes, posts, postVotes } from "@/lib/db/schema";
import { withNeonTransaction } from "@/lib/db/transaction";

export async function POST(request: Request) {
    try {
        const user = await requireVerifiedUser(request);
        const body = await readObject(request);
        const targetType = stringField(body, "target_type", { min: 1, max: 20 }) as string;
        const targetId = uuidField(body.target_id, "target_id");
        if (!["post", "comment"].includes(targetType)) throw new ApiError(422, "target_type is invalid");
        const result = await withNeonTransaction(async (tx) => {
            if (targetType === "post") {
                await tx.execute(sql`select id from posts where id = ${targetId} and deleted_at is null for update`);
                const [target] = await tx.select().from(posts).where(and(eq(posts.id, targetId), isNull(posts.deletedAt))).limit(1);
                if (!target) throw new ApiError(404, "Target not found");
                const [existing] = await tx.select().from(postVotes).where(and(
                    eq(postVotes.userId, user.id), eq(postVotes.postId, targetId),
                )).limit(1);
                const upvotes = existing ? Math.max(target.upvotes - 1, 0) : target.upvotes + 1;
                if (existing) await tx.delete(postVotes).where(and(eq(postVotes.userId, user.id), eq(postVotes.postId, targetId)));
                else await tx.insert(postVotes).values({ userId: user.id, postId: targetId, value: 1 });
                await tx.update(posts).set({ upvotes, updatedAt: new Date() }).where(eq(posts.id, targetId));
                return { upvotes, voted: !existing };
            }
            await tx.execute(sql`select id from comments where id = ${targetId} and deleted_at is null for update`);
            const [target] = await tx.select().from(comments).where(and(eq(comments.id, targetId), isNull(comments.deletedAt))).limit(1);
            if (!target) throw new ApiError(404, "Target not found");
            const [existing] = await tx.select().from(commentVotes).where(and(
                eq(commentVotes.userId, user.id), eq(commentVotes.commentId, targetId),
            )).limit(1);
            const upvotes = existing ? Math.max(target.upvotes - 1, 0) : target.upvotes + 1;
            if (existing) await tx.delete(commentVotes).where(and(eq(commentVotes.userId, user.id), eq(commentVotes.commentId, targetId)));
            else await tx.insert(commentVotes).values({ userId: user.id, commentId: targetId, value: 1 });
            await tx.update(comments).set({ upvotes, updatedAt: new Date() }).where(eq(comments.id, targetId));
            return { upvotes, voted: !existing };
        });
        return Response.json(result);
    } catch (error) {
        return jsonError(error);
    }
}
