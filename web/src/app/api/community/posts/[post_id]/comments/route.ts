import { requireVerifiedUser } from "@/lib/athlete-api/auth";
import { createForumComment } from "@/lib/athlete-api/community";
import { ApiError, jsonError, readObject, stringField, uuidField } from "@/lib/athlete-api/http";

export async function POST(request: Request, { params }: { params: Promise<{ post_id: string }> }) {
  try {
    const user = await requireVerifiedUser(request);
    const { post_id: rawPostId } = await params;
    const postId = uuidField(rawPostId, "post_id");
    const body = await readObject(request);
    const text = stringField(body, "body", { min: 1, max: 20_000 });
    const parentId = body.parent_id === null || body.parent_id === undefined
      ? null
      : uuidField(body.parent_id, "parent_id");
    let created;
    try {
      created = await createForumComment({
        postId,
        authorId: user.id,
        authorName: user.displayName,
        parentId,
        body: text,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Invalid parent comment") {
        throw new ApiError(400, error.message);
      }
      throw error;
    }
    if (!created) throw new ApiError(404, "Post not found");
    return Response.json(created);
  } catch (error) {
    return jsonError(error);
  }
}
