import { requireUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { deriveSkillMap } from "@/lib/core/skills";
import { updateProductProfile } from "@/lib/firestore-product";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await readObject(request);
    const answers: Record<string, string> = {
      sport: stringField(body, "sport", { min: 1, max: 120 }),
      role: stringField(body, "role", { min: 1, max: 120 }),
      years: stringField(body, "years", { min: 1, max: 80 }),
      relied_on: stringField(body, "relied_on", { min: 1, max: 4_000 }),
      favorite: stringField(body, "favorite", { min: 1, max: 240 }),
    };
    const community = stringField(body, "community", { optional: true });
    if (community !== undefined && !["join", "solo"].includes(community)) {
      throw new ApiError(422, "community is invalid");
    }
    if (community) answers.community = community;
    const skillMap = deriveSkillMap(answers);
    const profile = await updateProductProfile(user.id, {
      sport: answers.sport,
      intake_done: true,
      intake_answers: answers,
      skill_map: skillMap,
    });
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
