import { requireUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { deriveSkillMap } from "@/lib/core/skills";
import { updateProductProfile } from "@/lib/firestore-product";

const ONBOARDING_SPORTS = new Map([
  ["basketball", "Basketball"], ["football", "Football"], ["soccer", "Soccer"],
  ["hockey", "Hockey"], ["baseball", "Baseball"], ["tennis", "Tennis"],
  ["swimming", "Swimming"], ["track_field", "Track & Field"],
  ["volleyball", "Volleyball"], ["softball", "Softball"],
  ["wrestling", "Wrestling"], ["lacrosse", "Lacrosse"], ["golf", "Golf"],
  ["gymnastics", "Gymnastics"], ["other", "Other Sport"],
]);

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await readObject(request);

    // First-run onboarding uses the original mobile app's profile contract.
    // The optional Skill Map intake below remains available from Game Plan.
    if (body.athlete_status !== undefined) {
      const athleteStatus = stringField(body, "athlete_status", { min: 1, max: 20 });
      if (!["current", "former"].includes(athleteStatus)) {
        throw new ApiError(422, "athlete_status is invalid");
      }
      if (typeof body.group_interest !== "boolean") {
        throw new ApiError(422, "group_interest must be a boolean");
      }
      const sport = stringField(body, "sport", { min: 1, max: 80 });
      const sportLabel = ONBOARDING_SPORTS.get(sport);
      if (!sportLabel) throw new ApiError(422, "sport is invalid");
      const answers: Record<string, string> = {
        athlete_status: athleteStatus,
        sport: sportLabel,
        display_name: stringField(body, "display_name", { min: 1, max: 30 }),
        school: stringField(body, "school", { min: 1, max: 160 }),
        group_interest: String(body.group_interest),
      };
      const profile = await updateProductProfile(user.id, {
        athlete_status: athleteStatus,
        transition_status: athleteStatus === "current" ? "competing" : "transitioning",
        sport,
        display_name: answers.display_name,
        school: answers.school,
        group_interest: body.group_interest,
        intake_done: true,
        intake_answers: answers,
        skill_map: [],
      });
      if (!profile) throw new ApiError(503, "Profile unavailable");
      return Response.json({ user_id: user.id, intake_done: true, intake_answers: answers, skill_map: [] });
    }

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
