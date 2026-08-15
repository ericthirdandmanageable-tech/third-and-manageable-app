import { NextRequest, NextResponse } from "next/server";

import { auditedAdminMutation, isUuid } from "@/lib/admin-mutation";
import { verifyAdmin } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { isoNow } from "@/lib/firestore-product";

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { requestId, status, requestType } = await request.json();
  const allowed = requestType === "peer" ? ["pending", "connected", "resolved"] : ["pending", "resolved"];
  if (!isUuid(requestId) || !["peer", "tech"].includes(requestType) || !allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const updated = await auditedAdminMutation(
    request,
    { action: "support.status.set", targetType: `${requestType}_support_request`, targetId: requestId, metadata: { status } },
    async () => {
      const reference = getAdminFirestore().collection("support_requests").doc(requestId);
      const existing = await reference.get();
      if (!existing.exists || existing.data()?.type !== requestType) return [];
      await reference.set({
        status,
        updated_at: isoNow(),
        resolved_at: status === "resolved" ? isoNow() : null,
      }, { merge: true });
      return [{ id: requestId }];
    },
  );
  if (!updated.length) return NextResponse.json({ error: "Support request not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
