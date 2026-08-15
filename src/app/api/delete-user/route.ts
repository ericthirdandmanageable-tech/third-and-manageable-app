import { NextRequest, NextResponse } from "next/server";

import { setAppwriteUserStatus } from "@/lib/appwrite-server";
import { auditedAdminMutation, isUuid } from "@/lib/admin-mutation";
import { verifyAdmin } from "@/lib/auth";
import { getAdminAuth } from "@/lib/firebase-admin";
import { getProductProfile, isoNow, updateProductProfile } from "@/lib/firestore-product";

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = await request.json();
  if (!isUuid(userId)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const updated = await auditedAdminMutation(
    request,
    { action: "user.deactivate", targetType: "user", targetId: userId },
    async () => {
      if (!(await getProductProfile(userId))) return [];
      const now = isoNow();
      await Promise.all([
        updateProductProfile(userId, { deleted_at: now, suspended: true, suspended_at: now }),
        setAppwriteUserStatus(userId, false),
        getAdminAuth().revokeRefreshTokens(userId),
      ]);
      return [{ id: userId }];
    },
  );
  if (!updated.length) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ success: true, deactivated: true });
}
