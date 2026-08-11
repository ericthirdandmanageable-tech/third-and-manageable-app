import { eq } from "drizzle-orm";

import { requireVerifiedUser } from "@/lib/athlete-api/auth";
import { listPostRows, postJson } from "@/lib/athlete-api/community";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { forumMemberships, forums, posts } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { withNeonTransaction } from "@/lib/db/transaction";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ forum_id: string }> },
) {
    try {
        const { forum_id: forumId } = await params;
        const sort = new URL(request.url).searchParams.get("sort") ?? "hot";
        if (!["hot", "new", "top"].includes(sort)) throw new ApiError(422, "Invalid sort");
        return Response.json((await listPostRows({
            forumId,
            sort: sort as "hot" | "new" | "top",
        })).map(postJson));
    } catch (error) {
        return jsonError(error);
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ forum_id: string }> },
) {
    try {
        const user = await requireVerifiedUser(request);
        const { forum_id: forumId } = await params;
        const body = await readObject(request);
        const flair = stringField(body, "flair", { min: 1, max: 32 }) as string;
        const title = stringField(body, "title", { min: 3, max: 240 }) as string;
        const text = stringField(body, "body", { min: 3, max: 20_000 }) as string;
        if (!["WIN", "VENT", "QUESTION", "RESOURCE", "MILESTONE"].includes(flair)) {
            throw new ApiError(422, "flair is invalid");
        }
        const [forum] = await getDb().select({ id: forums.id }).from(forums).where(eq(forums.id, forumId)).limit(1);
        if (!forum) throw new ApiError(404, "Forum not found");
        const created = await withNeonTransaction(async (tx) => {
            await tx.insert(forumMemberships).values({ userId: user.id, forumId }).onConflictDoNothing();
            const [post] = await tx.insert(posts).values({
                forumId,
                authorId: user.id,
                authorName: user.displayName,
                flair,
                title,
                body: text,
            }).returning();
            return post;
        });
        return Response.json(postJson({ ...created, commentCount: 0 }));
    } catch (error) {
        return jsonError(error);
    }
}
