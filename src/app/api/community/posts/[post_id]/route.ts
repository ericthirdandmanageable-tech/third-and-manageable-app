import { commentsForPost, listPostRows, timeAgo } from "@/lib/athlete-api/community";
import { ApiError, jsonError, uuidField } from "@/lib/athlete-api/http";

export async function GET(_request: Request, { params }: { params: Promise<{ post_id: string }> }) {
  try {
    const { post_id: rawPostId } = await params;
    const postId = uuidField(rawPostId, "post_id");
    const post = (await listPostRows({})).find((row) => row.id === postId);
    if (!post) throw new ApiError(404, "Post not found");
    return Response.json({
      id: post.id,
      forum_id: post.forumId,
      author_name: post.authorName,
      flair: post.flair,
      title: post.title,
      body: post.body,
      upvotes: post.upvotes,
      time_ago: timeAgo(post.createdAt),
      comments: await commentsForPost(post.id),
    });
  } catch (error) {
    return jsonError(error);
  }
}
