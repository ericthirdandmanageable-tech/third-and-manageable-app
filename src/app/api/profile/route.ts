import { requireUser, type AthleteUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import {
  getProductProfile,
  updateProductProfileFromAthlete,
  type ProductProfile,
} from "@/lib/firestore-product";

function profileJson(user: AthleteUser, profile: ProductProfile | null) {
  return {
    id: user.id,
    user_id: user.id,
    email: user.email,
    display_name: profile?.display_name || user.displayName,
    school: profile?.school || "",
    school_id: profile?.school_id ?? null,
    sport: profile?.sport || "other",
    athlete_status:
      profile?.athlete_status || (user.status === "competing" ? "current" : "former"),
    status: user.status,
    headline: profile?.headline ?? user.headline,
    group_interest: profile?.group_interest === true,
    current_quarter:
      typeof profile?.current_quarter === "number" ? profile.current_quarter : 1,
    streak: typeof profile?.streak === "number" ? profile.streak : 0,
    joined_at: profile?.joined_at || user.createdAt.toISOString(),
    verified: user.verified,
    verification_requested: user.verificationRequested,
    ai_personality: profile?.ai_personality || "chill",
    profile_pic: profile?.profile_pic ?? null,
    intake_done: profile?.intake_done === true,
    intake_answers: profile?.intake_answers ?? {},
    skill_map: profile?.skill_map ?? [],
  };
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const profile = await getProductProfile(user.id);
    return Response.json(profileJson(user, profile));
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
    const schoolId = stringField(body, "school_id", { optional: true, max: 160 });
    const sport = stringField(body, "sport", { optional: true, max: 80 });
    const personality = stringField(body, "ai_personality", { optional: true, max: 40 });
    const profilePic = stringField(body, "profile_pic", { optional: true, max: 2_048 });
    if (status !== undefined && !["competing", "transitioning", "transitioned"].includes(status)) {
      throw new ApiError(422, "status is invalid");
    }
    if (
      personality !== undefined &&
      !["motivator", "chill", "analyst", "mentor", "huddle"].includes(personality)
    ) {
      throw new ApiError(422, "ai_personality is invalid");
    }
    if (body.group_interest !== undefined && typeof body.group_interest !== "boolean") {
      throw new ApiError(422, "group_interest must be a boolean");
    }
    if (
      body.current_quarter !== undefined &&
      (!Number.isInteger(body.current_quarter) ||
        (body.current_quarter as number) < 1 ||
        (body.current_quarter as number) > 20)
    ) {
      throw new ApiError(422, "current_quarter must be an integer from 1 to 20");
    }
    const values: Record<string, unknown> = {};
    if (displayName !== undefined) values.display_name = displayName;
    if (school !== undefined) values.school = school || null;
    if (status !== undefined) {
      values.transition_status = status;
      values.athlete_status = status === "competing" ? "current" : "former";
    }
    if (headline !== undefined) values.headline = headline || null;
    if (schoolId !== undefined) values.school_id = schoolId || null;
    if (sport !== undefined) values.sport = sport || "other";
    if (personality !== undefined) values.ai_personality = personality;
    if (profilePic !== undefined) values.profile_pic = profilePic || null;
    if (body.group_interest !== undefined) values.group_interest = body.group_interest;
    if (body.current_quarter !== undefined) values.current_quarter = body.current_quarter;
    const profile = await updateProductProfileFromAthlete(user.id, values);
    if (!profile) throw new ApiError(404, "Profile not found");
    return Response.json(profileJson({
      ...user,
      displayName: profile.display_name || user.displayName,
      school: profile.school || null,
      status: (profile.transition_status as typeof user.status) || user.status,
      headline: profile.headline || null,
      verified: profile.verified === true,
      verificationRequested: profile.verification_requested === true,
    }, profile));
  } catch (error) {
    return jsonError(error);
  }
}
