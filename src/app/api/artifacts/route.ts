import { eq } from "drizzle-orm";

import { requireUser } from "@/lib/athlete-api/auth";
import { jsonError } from "@/lib/athlete-api/http";
import { getDb } from "@/lib/db";
import { athleteProfiles, commitments } from "@/lib/db/schema";

export async function GET(request: Request) {
    try {
        const user = await requireUser(request);
        const [profileRows, commitmentRows] = await Promise.all([
            getDb().select({ intakeDone: athleteProfiles.intakeDone }).from(athleteProfiles)
                .where(eq(athleteProfiles.userId, user.id)).limit(1),
            getDb().select({ pathId: commitments.pathId }).from(commitments)
                .where(eq(commitments.userId, user.id)).limit(1),
        ]);
        return Response.json([
            { id: "day_counter", unlocked: true, title: "Day Counter" },
            { id: "weekly_recap", unlocked: true, title: "Weekly Recap" },
            { id: "skill_map", unlocked: profileRows[0]?.intakeDone ?? false, title: "Skill Map" },
            { id: "path_commitment", unlocked: Boolean(commitmentRows[0]?.pathId), title: "Path Commitment" },
        ]);
    } catch (error) {
        return jsonError(error);
    }
}
