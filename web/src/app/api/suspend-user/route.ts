import { NextRequest, NextResponse } from "next/server";

import { auditedAdminMutation, isUuid } from "@/lib/admin-mutation";
import { verifyAdmin } from "@/lib/auth";
import { getAdminAuth } from "@/lib/firebase-admin";
import { getProductProfile, isoNow, updateProductProfile } from "@/lib/firestore-product";

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId, suspended } = await request.json();
  if (!isUuid(userId) || typeof suspended !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const updated = await auditedAdminMutation(
    request,
    { action: "user.suspension.set", targetType: "user", targetId: userId, metadata: { suspended } },
    async () => {
      if (!(await getProductProfile(userId))) return [];
      await updateProductProfile(userId, {
        suspended,
        suspended_at: suspended ? isoNow() : null,
      });
      if (suspended) await getAdminAuth().revokeRefreshTokens(userId);
      return [{ id: userId }];
    },
  );
  if (!updated.length) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ success: true, suspended });
}
