import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { auditedAdminMutation, isUuid } from "@/lib/admin-mutation";
import { verifyAdmin } from "@/lib/auth";
import { users } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId, verified } = await request.json();
  if (!isUuid(userId) || typeof verified !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const updated = await auditedAdminMutation(
    request,
    {
      action: "user.verification.set",
      targetType: "user",
      targetId: userId,
      metadata: { verified },
    },
    (tx) =>
      tx
        .update(users)
        .set({ verified, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning({ id: users.id }),
  );
  if (!updated.length)
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ success: true, verified });
}
