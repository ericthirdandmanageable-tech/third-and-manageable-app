import { randomUUID } from "node:crypto";

import { normalizeEmail, requireUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { isoNow, updateProductProfile } from "@/lib/firestore-product";
import {
  createVerificationToken,
  hashVerificationToken,
  isUniversityEmail,
  sendUniversityConfirmationEmail,
} from "@/lib/verification-email";

const LINK_LIFETIME_MS = 24 * 60 * 60 * 1_000;
const RESEND_COOLDOWN_MS = 5 * 60 * 1_000;

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (user.verified) throw new ApiError(409, "Account is already verified");
    const body = await readObject(request);
    const email = stringField(body, "email", { min: 5, max: 320 });
    const normalizedEmail = normalizeEmail(email);
    if (!isUniversityEmail(normalizedEmail)) throw new ApiError(422, "Use a valid .edu email address");

    const database = getAdminFirestore();
    const [sameEmail, userRequests] = await Promise.all([
      database.collection("verification_requests").where("normalized_email", "==", normalizedEmail).limit(20).get(),
      database.collection("verification_requests").where("user_id", "==", user.id).limit(20).get(),
    ]);
    const owner = sameEmail.docs.find((document) => document.data().status === "approved");
    if (owner && owner.data().user_id !== user.id) {
      throw new ApiError(409, "That university email belongs to another account");
    }
    const recent = userRequests.docs.some((document) => {
      const value = document.data();
      return value.method === "university_email" && value.status === "pending" &&
        Date.parse(value.requested_at) > Date.now() - RESEND_COOLDOWN_MS;
    });
    if (recent) throw new ApiError(429, "A confirmation email was just sent. Try again in a few minutes.");

    const now = isoNow();
    const requestId = randomUUID();
    const token = createVerificationToken();
    const reference = database.collection("verification_requests").doc(requestId);
    const batch = database.batch();
    for (const document of userRequests.docs) {
      if (document.data().status === "pending") {
        batch.update(document.ref, { status: "cancelled", resolved_at: now });
      }
    }
    batch.create(reference, {
      user_id: user.id,
      method: "university_email",
      status: "pending",
      email: email.trim(),
      normalized_email: normalizedEmail,
      token_hash: hashVerificationToken(token),
      requested_at: now,
      expires_at: new Date(Date.now() + LINK_LIFETIME_MS).toISOString(),
      resolved_at: null,
    });
    await batch.commit();
    await updateProductProfile(user.id, {
      verification_requested: true,
      verification_requested_at: now,
    });

    const confirmationUrl = new URL("/api/verification/confirm", request.url);
    confirmationUrl.searchParams.set("token", token);
    try {
      await sendUniversityConfirmationEmail({
        requestId,
        to: email.trim(),
        displayName: user.displayName,
        confirmationUrl: confirmationUrl.toString(),
      });
    } catch (error) {
      console.error("University verification email failed", error);
      await reference.set({ status: "cancelled", resolved_at: isoNow() }, { merge: true });
      await updateProductProfile(user.id, {
        verification_requested: false,
        verification_requested_at: null,
      });
      throw new ApiError(503, "We could not send the confirmation email. Please try again.");
    }
    return Response.json({
      status: "pending",
      message: `Confirmation sent to ${email.trim()}. The link expires in 24 hours.`,
    });
  } catch (error) {
    return jsonError(error);
  }
}
