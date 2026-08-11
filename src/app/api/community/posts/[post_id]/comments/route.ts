import { and, eq, isNull } from "drizzle-orm";

import { requireVerifiedUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, stringField, uuidField } from "@/lib/athlete-api/http";
import { getDb } from "@/lib/db";
import { comments, posts } from "@/lib/db/schema";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ post_id: string }> },
) {
    try {
        const user = await requireVerifiedUser(request);
        const { post_id: rawPostId } = await params;
        const postId = uuidField(rawPostId, "post_id");
        const body = await readObject(request);
        const text = stringField(body, "body", { min: 1, max: 20_000 }) as string;
        const parentId = body.parent_id === null || body.parent_id === undefined
            ? null
            : uuidField(body.parent_id, "parent_id");
        const [post] = await getDb().select({ id: posts.id }).from(posts).where(and(
            eq(posts.id, postId), isNull(posts.deletedAt),
        )).limit(1);
        if (!post) throw new ApiError(404, "Post not found");
        if (parentId) {
            const [parent] = await getDb().select({ postId: comments.postId }).from(comments)
                .where(and(eq(comments.id, parentId), isNull(comments.deletedAt))).limit(1);
            if (!parent || parent.postId !== postId) throw new ApiError(400, "Invalid parent comment");
        }
        const [created] = await getDb().insert(comments).values({
            postId,
            authorId: user.id,
            authorName: user.displayName,
            parentId,
            body: text,
        }).returning();
        return Response.json({
            id: created.id,
            author_name: created.authorName,
            body: created.body,
            upvotes: 0,
            time_ago: "just now",
            replies: [],
        });
    } catch (error) {
        return jsonError(error);
    }
}
