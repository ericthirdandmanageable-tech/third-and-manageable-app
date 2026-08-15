import { requireUser } from "@/lib/athlete-api/auth";
import { jsonError } from "@/lib/athlete-api/http";
import { getProductProfile } from "@/lib/firestore-product";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const profile = await getProductProfile(user.id);
    return Response.json([
      { id: "day_counter", unlocked: true, title: "Day Counter" },
      { id: "weekly_recap", unlocked: true, title: "Weekly Recap" },
      { id: "skill_map", unlocked: profile?.intake_done === true, title: "Skill Map" },
      { id: "path_commitment", unlocked: Boolean(profile?.committed_path_id), title: "Path Commitment" },
    ]);
  } catch (error) {
    return jsonError(error);
  }
}
