import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { auditedAdminMutation, isUuid } from "@/lib/admin-mutation";
import { verifyAdmin } from "@/lib/auth";
import { users, verificationRequests } from "@/lib/db/schema";
export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId, verified } = await request.json();
  if (!isUuid(userId) || typeof verified !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await auditedAdminMutation(
    request,
    {
      action: "user.verification.set",
      targetType: "user",
      targetId: userId,
      metadata: { verified },
    },
    async (tx) => {
      const now = new Date();
      if (verified) {
        await tx
          .select({ id: verificationRequests.id })
          .from(verificationRequests)
          .where(
            and(
              eq(verificationRequests.userId, userId),
              eq(verificationRequests.status, "pending"),
            ),
          )
          .for("update");
      }
      const [updated] = await tx
        .update(users)
        .set({
          verified,
          verificationRequested: false,
          verificationRequestedAt: null,
          updatedAt: now,
        })
        .where(and(eq(users.id, userId), eq(users.verified, !verified)))
        .returning({ id: users.id });

      if (updated) {
        if (verified) {
          await tx
            .update(verificationRequests)
            .set({ status: "approved", resolvedAt: now })
            .where(
              and(
                eq(verificationRequests.userId, userId),
                eq(verificationRequests.status, "pending"),
              ),
            );
        }
        return [{ changed: true }];
      }

      const [existing] = await tx
        .select({ id: users.id, verified: users.verified })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return existing ? [{ changed: false }] : [];
    },
  );
  if (!result.length)
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ success: true, verified, changed: result[0].changed });
}
