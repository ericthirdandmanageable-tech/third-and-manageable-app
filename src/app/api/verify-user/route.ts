import { NextRequest, NextResponse } from "next/server";

import { auditedAdminMutation, isUuid } from "@/lib/admin-mutation";
import { verifyAdmin } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { getProductProfile, isoNow, updateProductProfile } from "@/lib/firestore-product";

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId, verified } = await request.json();
  if (!isUuid(userId) || typeof verified !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const result = await auditedAdminMutation(
    request,
    { action: "user.verification.set", targetType: "user", targetId: userId, metadata: { verified } },
    async () => {
      const profile = await getProductProfile(userId);
      if (!profile) return [];
      const changed = profile.verified !== verified;
      await updateProductProfile(userId, {
        verified,
        verification_requested: false,
        verification_requested_at: null,
      });
      if (verified) {
        const pending = await getAdminFirestore()
          .collection("verification_requests")
          .where("user_id", "==", userId)
          .where("status", "==", "pending")
          .limit(20)
          .get();
        const batch = getAdminFirestore().batch();
        for (const document of pending.docs) {
          batch.update(document.ref, { status: "approved", resolved_at: isoNow() });
        }
        await batch.commit();
      }
      return [{ changed }];
    },
  );
  if (!result.length) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ success: true, verified, changed: result[0].changed });
}
