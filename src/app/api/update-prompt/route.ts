import { NextRequest, NextResponse } from "next/server";

import { auditedAdminMutation } from "@/lib/admin-mutation";
import { verifyAdmin } from "@/lib/auth";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { isoNow } from "@/lib/firestore-product";

const MAX_PROMPT_LENGTH = 280;

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { roomId, prompt, authorName } = await request.json();
  const cleanRoomId = typeof roomId === "string" ? roomId.trim() : "";
  const cleanPrompt = typeof prompt === "string" ? prompt.trim() : "";
  const cleanAuthor = typeof authorName === "string" ? authorName.trim() : "";
  if (!cleanRoomId || cleanRoomId.length > 120 || !cleanPrompt || cleanPrompt.length > MAX_PROMPT_LENGTH || !cleanAuthor || cleanAuthor.length > 80) {
    return NextResponse.json({ error: "Invalid room, prompt, or author" }, { status: 400 });
  }
  const now = isoNow();
  await auditedAdminMutation(
    request,
    { action: "forum.daily_prompt.set", targetType: "forum", targetId: cleanRoomId },
    async () => {
      await getAdminFirestore().collection("rooms").doc(cleanRoomId).set({
        room_id: cleanRoomId,
        name: cleanRoomId === "global" ? "Global Athlete Room" : cleanRoomId,
        type: cleanRoomId.startsWith("school_") ? "school" : "global",
        daily_prompt: cleanPrompt,
        daily_prompt_author: cleanAuthor,
        daily_prompt_updated_at: now,
        updated_at: now,
      }, { merge: true });
      return [{ id: cleanRoomId }];
    },
  );
  return NextResponse.json({
    success: true,
    roomId: cleanRoomId,
    daily_prompt: cleanPrompt,
    daily_prompt_author: cleanAuthor,
  });
}
