import { requireVerifiedUser } from "@/lib/athlete-api/auth";
import { setForumMembership } from "@/lib/athlete-api/community";
import { ApiError, jsonError } from "@/lib/athlete-api/http";
import { getForum } from "@/lib/core/community";

async function membership(
  request: Request,
  params: Promise<{ forum_id: string }>,
  joined: boolean,
) {
  const user = await requireVerifiedUser(request);
  const { forum_id: forumId } = await params;
  if (!getForum(forumId)) throw new ApiError(404, "Forum not found");
  const memberCount = await setForumMembership(user.id, forumId, joined);
  return Response.json({ forum_id: forumId, joined, member_count: memberCount });
}

export async function POST(request: Request, context: { params: Promise<{ forum_id: string }> }) {
  try { return await membership(request, context.params, true); } catch (error) { return jsonError(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ forum_id: string }> }) {
  try { return await membership(request, context.params, false); } catch (error) { return jsonError(error); }
}
