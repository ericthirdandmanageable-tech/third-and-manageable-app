import { NextRequest, NextResponse } from "next/server";

import { auditedAdminMutation } from "@/lib/admin-mutation";
import { verifyAdmin } from "@/lib/auth";
import { forums } from "@/lib/db/schema";

const MAX_PROMPT_LENGTH = 280;

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { roomId, prompt, authorName } = await request.json();
  const cleanRoomId = typeof roomId === "string" ? roomId.trim() : "";
  const cleanPrompt = typeof prompt === "string" ? prompt.trim() : "";
  const cleanAuthor = typeof authorName === "string" ? authorName.trim() : "";
  if (
    !cleanRoomId ||
    cleanRoomId.length > 120 ||
    !cleanPrompt ||
    cleanPrompt.length > MAX_PROMPT_LENGTH ||
    !cleanAuthor ||
    cleanAuthor.length > 80
  ) {
    return NextResponse.json(
      { error: "Invalid room, prompt, or author" },
      { status: 400 },
    );
  }

  const now = new Date();
  await auditedAdminMutation(
    request,
    {
      action: "forum.daily_prompt.set",
      targetType: "forum",
      targetId: cleanRoomId,
    },
    (tx) =>
      tx
        .insert(forums)
        .values({
          id: cleanRoomId,
          title: cleanRoomId === "global" ? "Global Athlete Room" : cleanRoomId,
          category: cleanRoomId.startsWith("school_") ? "School" : "Global",
          description: "Athlete community",
          icon: "users",
          dailyPrompt: cleanPrompt,
          dailyPromptAuthor: cleanAuthor,
          dailyPromptUpdatedAt: now,
        })
        .onConflictDoUpdate({
          target: forums.id,
          set: {
            dailyPrompt: cleanPrompt,
            dailyPromptAuthor: cleanAuthor,
            dailyPromptUpdatedAt: now,
            updatedAt: now,
          },
        }),
  );
  return NextResponse.json({
    success: true,
    roomId: cleanRoomId,
    daily_prompt: cleanPrompt,
    daily_prompt_author: cleanAuthor,
  });
}
