import { randomUUID } from "node:crypto";

import { requireUser } from "@/lib/athlete-api/auth";
import { jsonError } from "@/lib/athlete-api/http";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { isoNow } from "@/lib/firestore-product";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const id = randomUUID();
    await getAdminFirestore().collection("support_requests").doc(id).create({
      user_id: user.id,
      type: "peer",
      message: "Peer support connection requested",
      status: "pending",
      created_at: isoNow(),
      updated_at: isoNow(),
    });
    return Response.json({
      id,
      status: "notified",
      message: "We've notified the community. A peer will reach out soon.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
