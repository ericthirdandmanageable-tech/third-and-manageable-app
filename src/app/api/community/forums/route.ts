import { asc, eq, sql } from "drizzle-orm";

import { optionalUser } from "@/lib/athlete-api/auth";
import { jsonError } from "@/lib/athlete-api/http";
import { getDb } from "@/lib/db";
import { forumMemberships, forums } from "@/lib/db/schema";

export async function GET(request: Request) {
    try {
        const user = await optionalUser(request);
        const [rows, joined] = await Promise.all([
            getDb().select({
                forum: forums,
                memberCount: sql<number>`count(${forumMemberships.userId})::int`,
            }).from(forums).leftJoin(forumMemberships, eq(forumMemberships.forumId, forums.id))
                .groupBy(forums.id).orderBy(asc(forums.category), asc(forums.title)),
            user
                ? getDb().select({ id: forumMemberships.forumId }).from(forumMemberships)
                    .where(eq(forumMemberships.userId, user.id))
                : Promise.resolve([]),
        ]);
        const joinedIds = new Set(joined.map((row) => row.id));
        return Response.json(rows.map(({ forum, memberCount }) => ({
            id: forum.id,
            title: forum.title,
            category: forum.category,
            description: forum.description,
            member_count: memberCount,
            active_now: forum.activeNow,
            icon: forum.icon,
            path_id: forum.pathId,
            joined: joinedIds.has(forum.id),
        })));
    } catch (error) {
        return jsonError(error);
    }
}
