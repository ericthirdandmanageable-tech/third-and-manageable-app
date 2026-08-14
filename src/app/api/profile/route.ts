import { eq } from "drizzle-orm";

import { requireUser, userJson } from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { getDb } from "@/lib/db";
import { athleteProfiles, users } from "@/lib/db/schema";

async function profileFor(userId: string) {
    await getDb().insert(athleteProfiles).values({ userId }).onConflictDoNothing();
    const [profile] = await getDb().select().from(athleteProfiles)
        .where(eq(athleteProfiles.userId, userId)).limit(1);
    return profile;
}

export async function GET(request: Request) {
    try {
        const user = await requireUser(request);
        const profile = await profileFor(user.id);
        return Response.json({
            user_id: user.id,
            intake_done: profile.intakeDone,
            intake_answers: profile.intakeAnswers ?? {},
            skill_map: profile.skillMap ?? [],
        });
    } catch (error) {
        return jsonError(error);
    }
}

export async function PATCH(request: Request) {
    try {
        const user = await requireUser(request);
        const body = await readObject(request);
        const displayName = stringField(body, "display_name", { optional: true, min: 1, max: 40 });
        const school = stringField(body, "school", { optional: true, max: 120 });
        const status = stringField(body, "status", { optional: true });
        const headline = stringField(body, "headline", { optional: true, max: 140 });
        if (status !== undefined && !["competing", "transitioning", "transitioned"].includes(status)) {
            throw new ApiError(422, "status is invalid");
        }
        const values: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
        if (displayName !== undefined) values.displayName = displayName;
        if (school !== undefined) values.school = school || null;
        if (status !== undefined) values.status = status as "competing" | "transitioning" | "transitioned";
        if (headline !== undefined) values.headline = headline || null;
        const [updated] = await getDb().update(users).set(values).where(eq(users.id, user.id)).returning();
        return Response.json(userJson({ ...user, ...updated }));
    } catch (error) {
        return jsonError(error);
    }
}
