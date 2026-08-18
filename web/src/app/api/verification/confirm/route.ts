import { NextResponse } from "next/server";

import { getAdminFirestore } from "@/lib/firebase-admin";
import { isoNow } from "@/lib/firestore-product";
import { hashVerificationToken } from "@/lib/verification-email";

function profileRedirect(request: Request, result: string) {
  const url = new URL("/profile", request.url);
  url.searchParams.set("verification", result);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return profileRedirect(request, "invalid");
  try {
    const database = getAdminFirestore();
    const matches = await database
      .collection("verification_requests")
      .where("token_hash", "==", hashVerificationToken(token))
      .limit(1)
      .get();
    if (matches.empty) return profileRedirect(request, "invalid");
    const reference = matches.docs[0].ref;
    const result = await database.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const value = snapshot.data();
      if (!value) return "invalid";
      if (value.status === "approved") return "already-confirmed";
      if (value.status !== "pending") return "invalid";
      const now = isoNow();
      const profile = database.collection("profiles").doc(value.user_id);
      if (!value.expires_at || Date.parse(value.expires_at) <= Date.now()) {
        transaction.update(reference, { status: "expired", resolved_at: now });
        transaction.set(profile, {
          verification_requested: false,
          verification_requested_at: null,
          updated_at: now,
        }, { merge: true });
        return "expired";
      }
      transaction.update(reference, { status: "approved", resolved_at: now });
      transaction.set(profile, {
        verified: true,
        verification_requested: false,
        verification_requested_at: null,
        university_email: value.email,
        university_email_normalized: value.normalized_email,
        updated_at: now,
      }, { merge: true });
      return "confirmed";
    });
    return profileRedirect(request, result);
  } catch (error) {
    console.error("University verification confirmation failed", error);
    return profileRedirect(request, "unavailable");
  }
}
