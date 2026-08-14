import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { auditedAdminMutation, isUuid } from "@/lib/admin-mutation";
import { verifyAdmin } from "@/lib/auth";
import { peerSupportRequests, techSupportRequests } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { requestId, status, requestType } = await request.json();
  const allowed =
    requestType === "peer"
      ? ["pending", "connected", "resolved"]
      : ["pending", "resolved"];
  if (
    !isUuid(requestId) ||
    !["peer", "tech"].includes(requestType) ||
    !allowed.includes(status)
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const now = new Date();
  const updated = await auditedAdminMutation(
    request,
    {
      action: "support.status.set",
      targetType: `${requestType}_support_request`,
      targetId: requestId,
      metadata: { status },
    },
    (tx) =>
      requestType === "peer"
        ? tx
            .update(peerSupportRequests)
            .set({
              status: status === "pending" ? "notified" : status,
              updatedAt: now,
              resolvedAt: status === "resolved" ? now : null,
            })
            .where(eq(peerSupportRequests.id, requestId))
            .returning({ id: peerSupportRequests.id })
        : tx
            .update(techSupportRequests)
            .set({
              status,
              updatedAt: now,
              resolvedAt: status === "resolved" ? now : null,
            })
            .where(eq(techSupportRequests.id, requestId))
            .returning({ id: techSupportRequests.id }),
  );
  if (!updated.length)
    return NextResponse.json(
      { error: "Support request not found" },
      { status: 404 },
    );
  return NextResponse.json({ success: true });
}
