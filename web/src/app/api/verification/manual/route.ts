import { randomUUID } from "node:crypto";

import { requireUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { isoNow, updateProductProfile } from "@/lib/firestore-product";
import {
  MANUAL_VERIFICATION_REASONS,
  sendManualVerificationEmails,
  type ManualVerificationReason,
} from "@/lib/verification-email";

const RESEND_COOLDOWN_MS = 10 * 60 * 1_000;

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (user.verified) throw new ApiError(409, "Account is already verified");
    const body = await readObject(request);
    const reasonCategory = stringField(body, "reason_category", { min: 2, max: 80 }) as ManualVerificationReason;
    const reason = stringField(body, "reason", { optional: true, max: 1_000 })?.trim() || null;
    if (!MANUAL_VERIFICATION_REASONS.includes(reasonCategory)) {
      throw new ApiError(422, "Choose a valid review route");
    }

    const database = getAdminFirestore();
    const existing = await database
      .collection("verification_requests")
      .where("user_id", "==", user.id)
      .limit(20)
      .get();
    const recent = existing.docs.some((document) => {
      const value = document.data();
      return value.method === "manual" && value.status === "pending" &&
        Date.parse(value.requested_at) > Date.now() - RESEND_COOLDOWN_MS;
    });
    if (recent) {
      return Response.json({ status: "pending", message: "Your request is already with the verification team." });
    }

    const now = isoNow();
    const requestId = randomUUID();
    const batch = database.batch();
    for (const document of existing.docs) {
      if (document.data().status === "pending") {
        batch.update(document.ref, { status: "cancelled", resolved_at: now });
      }
    }
    batch.create(database.collection("verification_requests").doc(requestId), {
      user_id: user.id,
      method: "manual",
      status: "pending",
      reason_category: reasonCategory,
      reason,
      requested_at: now,
      resolved_at: null,
    });
    await batch.commit();
    await updateProductProfile(user.id, {
      verification_requested: true,
      verification_requested_at: now,
    });

    let notificationSent = true;
    try {
      await sendManualVerificationEmails({
        requestId,
        appUrl: new URL(request.url).origin,
        userId: user.id,
        userEmail: user.email || "No primary email",
        displayName: user.displayName,
        school: user.school,
        reasonCategory,
        reason,
      });
    } catch (error) {
      notificationSent = false;
      console.error("Manual verification notification failed", error);
    }
    return Response.json({
      status: "pending",
      notification_sent: notificationSent,
      message: notificationSent
        ? "Your request was sent to the verification team. The first admin approval completes it."
        : "Your request is in the admin queue, but email delivery is temporarily unavailable.",
    }, { status: notificationSent ? 200 : 202 });
  } catch (error) {
    return jsonError(error);
  }
}
