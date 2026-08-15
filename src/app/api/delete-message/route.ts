import { NextRequest, NextResponse } from "next/server";

import { auditedAdminMutation, isUuid } from "@/lib/admin-mutation";
import { verifyAdmin } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { isoNow } from "@/lib/firestore-product";

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { messageId } = await request.json();
  if (!isUuid(messageId)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const updated = await auditedAdminMutation(
    request,
    { action: "community.content.remove", targetType: "community_content", targetId: messageId },
    async () => {
      const database = getAdminFirestore();
      for (const collection of ["posts", "comments", "messages"]) {
        const reference = database.collection(collection).doc(messageId);
        const existing = await reference.get();
        if (existing.exists) {
          await reference.set(
            collection === "messages"
              ? { content: "[removed by moderator]", deleted_at: isoNow(), updated_at: isoNow() }
              : { body: "[removed by moderator]", deleted_at: isoNow(), updated_at: isoNow() },
            { merge: true },
          );
          return [{ id: messageId }];
        }
      }
      return [];
    },
  );
  if (!updated.length) return NextResponse.json({ error: "Content not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
