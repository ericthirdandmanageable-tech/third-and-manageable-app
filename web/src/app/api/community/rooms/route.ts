import { requireUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError } from "@/lib/athlete-api/http";
import { getAdminFirestore } from "@/lib/firebase-admin";

export async function GET(request: Request) {
  try {
    await requireUser(request);
    const search = new URL(request.url).searchParams;
    const roomId = search.get("room_id");
    const school = search.get("school");
    let query = getAdminFirestore().collection("rooms").limit(1);
    if (roomId) query = query.where("room_id", "==", roomId);
    else if (school) {
      query = query.where("type", "==", "school").where("school", "==", school);
    } else {
      throw new ApiError(422, "room_id or school is required");
    }
    const snapshot = await query.get();
    if (snapshot.empty) return Response.json(null);
    const document = snapshot.docs[0];
    return Response.json({ id: document.id, ...document.data() });
  } catch (error) {
    return jsonError(error);
  }
}
