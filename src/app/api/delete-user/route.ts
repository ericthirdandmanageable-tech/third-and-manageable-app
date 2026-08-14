import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { auditedAdminMutation, isUuid } from "@/lib/admin-mutation";
import { verifyAdmin } from "@/lib/auth";
import { users } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId } = await request.json();
  if (!isUuid(userId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const now = new Date();
  const updated = await auditedAdminMutation(
    request,
    { action: "user.deactivate", targetType: "user", targetId: userId },
    (tx) =>
      tx
        .update(users)
        .set({
          deletedAt: now,
          suspended: true,
          suspendedAt: now,
          authVersion: sql`${users.authVersion} + 1`,
          updatedAt: now,
        })
        .where(eq(users.id, userId))
        .returning({ id: users.id }),
  );
  if (!updated.length)
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ success: true, deactivated: true });
}
