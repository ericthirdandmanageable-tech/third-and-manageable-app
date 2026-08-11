import { requireUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { deriveSkillMap } from "@/lib/core/skills";
import { getDb } from "@/lib/db";
import { athleteProfiles } from "@/lib/db/schema";

export async function POST(request: Request) {
    try {
        const user = await requireUser(request);
        const body = await readObject(request);
        const answers: Record<string, string> = {
            sport: stringField(body, "sport", { min: 1, max: 120 }) as string,
            role: stringField(body, "role", { min: 1, max: 120 }) as string,
            years: stringField(body, "years", { min: 1, max: 80 }) as string,
            relied_on: stringField(body, "relied_on", { min: 1, max: 4000 }) as string,
            favorite: stringField(body, "favorite", { min: 1, max: 240 }) as string,
        };
        const community = stringField(body, "community", { optional: true });
        if (community !== undefined && !["join", "solo"].includes(community)) {
            throw new ApiError(422, "community is invalid");
        }
        if (community) answers.community = community;
        const skillMap = deriveSkillMap(answers);
        const [profile] = await getDb().insert(athleteProfiles).values({
            userId: user.id,
            sport: answers.sport,
            role: answers.role,
            years: answers.years,
            reliedOn: answers.relied_on,
            favorite: answers.favorite,
            intakeDone: true,
            intakeAnswers: answers,
            skillMap,
            updatedAt: new Date(),
        }).onConflictDoUpdate({
            target: athleteProfiles.userId,
            set: {
                sport: answers.sport,
                role: answers.role,
                years: answers.years,
                reliedOn: answers.relied_on,
                favorite: answers.favorite,
                intakeDone: true,
                intakeAnswers: answers,
                skillMap,
                updatedAt: new Date(),
            },
        }).returning();
        if (!profile) throw new ApiError(503, "Profile unavailable");
        return Response.json({
            user_id: user.id,
            intake_done: true,
            intake_answers: answers,
            skill_map: skillMap,
        });
    } catch (error) {
        return jsonError(error);
    }
}
