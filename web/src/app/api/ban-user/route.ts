import { NextRequest, NextResponse } from "next/server";

import { setAppwriteUserStatus } from "@/lib/appwrite-server";
import { auditedAdminMutation, isUuid } from "@/lib/admin-mutation";
import { verifyAdmin } from "@/lib/auth";
import { getAdminAuth } from "@/lib/firebase-admin";
import { getProductProfile, isoNow, updateProductProfile } from "@/lib/firestore-product";

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId, banned, banType } = await request.json();
  if (!isUuid(userId) || typeof banned !== "boolean" || !["chat", "platform"].includes(banType)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const updated = await auditedAdminMutation(
    request,
    { action: `user.${banType}.ban.set`, targetType: "user", targetId: userId, metadata: { banned } },
    async () => {
      if (!(await getProductProfile(userId))) return [];
      const now = isoNow();
      if (banType === "chat") {
        await updateProductProfile(userId, { chat_banned: banned, chat_banned_at: banned ? now : null });
      } else {
        await Promise.all([
          updateProductProfile(userId, { banned, banned_at: banned ? now : null }),
          setAppwriteUserStatus(userId, !banned),
          banned ? getAdminAuth().revokeRefreshTokens(userId) : Promise.resolve(),
        ]);
      }
      return [{ id: userId }];
    },
  );
  if (!updated.length) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ success: true, banned, banType });
}
