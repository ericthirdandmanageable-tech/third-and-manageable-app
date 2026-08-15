import { randomUUID } from "node:crypto";

import { requireUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, stringField, uuidField } from "@/lib/athlete-api/http";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { isoNow } from "@/lib/firestore-product";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await readObject(request);
    const messageId = uuidField(body.message_id, "message_id");
    const reason = stringField(body, "reason", { optional: true, max: 240 }) || "user_reported_from_app";
    const database = getAdminFirestore();
    const message = await database.collection("messages").doc(messageId).get();
    if (!message.exists) throw new ApiError(404, "Message not found");
    const data = message.data() ?? {};
    const reference = database.collection("content_reports").doc(randomUUID());
    const report = {
      reporter_id: user.id,
      reported_user_id: String(data.user_id || ""),
      room_id: String(data.room_id || ""),
      message_id: messageId,
      content_preview: String(data.content || "").slice(0, 240),
      reason,
      created_at: isoNow(),
      status: "open",
    };
    await reference.create(report);
    return Response.json({ id: reference.id, ...report });
  } catch (error) {
    return jsonError(error);
  }
}
