import { requireUser } from "@/lib/athlete-api/auth";
import { jsonError, uuidField } from "@/lib/athlete-api/http";
import { getProductProfile } from "@/lib/firestore-product";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ user_id: string }> },
) {
  try {
    await requireUser(request);
    const { user_id: rawUserId } = await params;
    const userId = uuidField(rawUserId, "user_id");
    const profile = await getProductProfile(userId);
    if (!profile) return Response.json(null);
    return Response.json({
      id: userId,
      display_name: profile.display_name || "Athlete",
      sport: profile.sport || "other",
      athlete_status: profile.athlete_status || "former",
      school: profile.school || "N/A",
      group_interest: profile.group_interest === true,
      current_quarter: profile.current_quarter || 1,
      streak: profile.streak || 0,
      joined_at: profile.joined_at || "",
      verified: profile.verified === true,
      verification_requested: profile.verification_requested === true,
      profile_pic: profile.profile_pic || undefined,
      ai_personality: profile.ai_personality || undefined,
    });
  } catch (error) {
    return jsonError(error);
  }
}
