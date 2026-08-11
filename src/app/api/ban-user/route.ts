import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { auditedAdminMutation, isUuid } from "@/lib/admin-mutation";
import { verifyAdmin } from "@/lib/auth";
import { users } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId, banned, banType } = await request.json();
  if (
    !isUuid(userId) ||
    typeof banned !== "boolean" ||
    !["chat", "platform"].includes(banType)
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const now = new Date();
  const values =
    banType === "chat"
      ? {
          chatBanned: banned,
          chatBannedAt: banned ? now : null,
          updatedAt: now,
        }
      : {
          banned,
          bannedAt: banned ? now : null,
          authVersion: sql`${users.authVersion} + 1`,
          updatedAt: now,
        };
  const updated = await auditedAdminMutation(
    request,
    {
      action: `user.${banType}.ban.set`,
      targetType: "user",
      targetId: userId,
      metadata: { banned },
    },
    (tx) =>
      tx
        .update(users)
        .set(values)
        .where(eq(users.id, userId))
        .returning({ id: users.id }),
  );
  if (!updated.length)
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ success: true, banned, banType });
}
