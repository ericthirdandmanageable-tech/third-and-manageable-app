import { requireUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { isoNow, listUserDocuments, stableDocumentId } from "@/lib/firestore-product";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const blocks = await listUserDocuments<{ blocked_user_id: string }>(
      "user_blocks",
      user.id,
      500,
    );
    return Response.json({ blocked_user_ids: blocks.map((row) => row.blocked_user_id) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await readObject(request);
    const blockedUserId = stringField(body, "blocked_user_id", { min: 1, max: 128 });
    if (blockedUserId === user.id) throw new ApiError(422, "You cannot block yourself");
    const reference = getAdminFirestore()
      .collection("user_blocks")
      .doc(stableDocumentId(user.id, blockedUserId));
    const block = {
      user_id: user.id,
      blocked_user_id: blockedUserId,
      created_at: isoNow(),
    };
    await reference.set(block, { merge: true });
    return Response.json({ id: reference.id, ...block });
  } catch (error) {
    return jsonError(error);
  }
}
