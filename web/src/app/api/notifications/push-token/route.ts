import { requireUser } from "@/lib/athlete-api/auth";
import { jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { isoNow } from "@/lib/firestore-product";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await readObject(request);
    const token = stringField(body, "token", { min: 10, max: 512 });
    await getAdminFirestore().collection("push_tokens").doc(user.id).set(
      { user_id: user.id, token, updated_at: isoNow() },
      { merge: true },
    );
    return Response.json({ registered: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser(request);
    await getAdminFirestore().collection("push_tokens").doc(user.id).delete();
    return Response.json({ registered: false });
  } catch (error) {
    return jsonError(error);
  }
}
