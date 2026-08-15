import { requireVerifiedUser } from "@/lib/athlete-api/auth";
import { createForumPost, listPostRows, postJson } from "@/lib/athlete-api/community";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { getForum } from "@/lib/core/community";

export async function GET(request: Request, { params }: { params: Promise<{ forum_id: string }> }) {
  try {
    const { forum_id: forumId } = await params;
    const sort = new URL(request.url).searchParams.get("sort") ?? "hot";
    if (!getForum(forumId)) throw new ApiError(404, "Forum not found");
    if (!["hot", "new", "top"].includes(sort)) throw new ApiError(422, "Invalid sort");
    return Response.json((await listPostRows({ forumId, sort: sort as "hot" | "new" | "top" })).map(postJson));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ forum_id: string }> }) {
  try {
    const user = await requireVerifiedUser(request);
    const { forum_id: forumId } = await params;
    const body = await readObject(request);
    const flair = stringField(body, "flair", { min: 1, max: 32 });
    const title = stringField(body, "title", { min: 3, max: 240 });
    const text = stringField(body, "body", { min: 3, max: 20_000 });
    if (!["WIN", "VENT", "QUESTION", "RESOURCE", "MILESTONE"].includes(flair)) {
      throw new ApiError(422, "flair is invalid");
    }
    if (!getForum(forumId)) throw new ApiError(404, "Forum not found");
    return Response.json(postJson(await createForumPost({
      forumId,
      authorId: user.id,
      authorName: user.displayName,
      flair,
      title,
      body: text,
    })));
  } catch (error) {
    return jsonError(error);
  }
}
