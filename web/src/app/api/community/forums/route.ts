import { optionalUser } from "@/lib/athlete-api/auth";
import { jsonError } from "@/lib/athlete-api/http";
import { FORUMS } from "@/lib/core/community";
import { listAllDocuments, listUserDocuments } from "@/lib/firestore-product";

export async function GET(request: Request) {
  try {
    const user = await optionalUser(request);
    const [memberships, joined] = await Promise.all([
      listAllDocuments<{ forum_id: string }>("forum_memberships"),
      user
        ? listUserDocuments<{ forum_id: string }>("forum_memberships", user.id, 200)
        : Promise.resolve([]),
    ]);
    const counts = new Map<string, number>();
    for (const membership of memberships) {
      counts.set(membership.forum_id, (counts.get(membership.forum_id) ?? 0) + 1);
    }
    const joinedIds = new Set(joined.map((membership) => membership.forum_id));
    return Response.json(
      FORUMS.map((forum) => ({
        id: forum.id,
        title: forum.title,
        category: forum.category,
        description: forum.description,
        member_count: counts.get(forum.id) ?? forum.memberCount,
        active_now: forum.activeNow,
        icon: forum.icon,
        path_id: forum.pathId,
        joined: joinedIds.has(forum.id),
      })).sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title)),
    );
  } catch (error) {
    return jsonError(error);
  }
}
