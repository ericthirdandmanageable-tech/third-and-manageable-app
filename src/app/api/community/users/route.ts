import { requireUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError } from "@/lib/athlete-api/http";
import { getAdminFirestore } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  try {
    await requireUser(request);
    const displayName = new URL(request.url).searchParams.get("display_name")?.trim();
    if (!displayName || displayName.length > 80) {
      throw new ApiError(422, "display_name is required");
    }
    const snapshot = await getAdminFirestore()
      .collection("profiles")
      .where("display_name", "==", displayName)
      .limit(1)
      .get();
    return Response.json(snapshot.empty ? null : { user_id: snapshot.docs[0].id });
  } catch (error) {
    return jsonError(error);
  }
}
