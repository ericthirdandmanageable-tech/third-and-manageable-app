import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { auditedAdminMutation, isUuid } from "@/lib/admin-mutation";
import { verifyAdmin } from "@/lib/auth";
import { comments, posts } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { messageId } = await request.json();
  if (!isUuid(messageId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const now = new Date();
  const updated = await auditedAdminMutation(
    request,
    {
      action: "community.content.remove",
      targetType: "community_content",
      targetId: messageId,
    },
    async (tx) => {
      const removedPosts = await tx
        .update(posts)
        .set({ body: "[removed by moderator]", deletedAt: now, updatedAt: now })
        .where(eq(posts.id, messageId))
        .returning({ id: posts.id });
      if (removedPosts.length) return removedPosts;
      return tx
        .update(comments)
        .set({ body: "[removed by moderator]", deletedAt: now, updatedAt: now })
        .where(eq(comments.id, messageId))
        .returning({ id: comments.id });
    },
  );
  if (!updated.length)
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
