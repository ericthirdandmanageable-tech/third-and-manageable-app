import { randomUUID } from "node:crypto";

import { requireUser } from "@/lib/athlete-api/auth";
import { jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { isoNow } from "@/lib/firestore-product";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await readObject(request);
    const message = stringField(body, "message", { min: 3, max: 2_000 });
    await getAdminFirestore().collection("support_requests").doc(randomUUID()).create({
      user_id: user.id,
      type: "tech",
      message,
      status: "pending",
      created_at: isoNow(),
      updated_at: isoNow(),
    });
    return Response.json({ status: "open", message: "Request sent. We'll be in touch." });
  } catch (error) {
    return jsonError(error);
  }
}
