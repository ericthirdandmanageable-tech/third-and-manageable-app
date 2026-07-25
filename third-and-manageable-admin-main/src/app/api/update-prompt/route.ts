import { verifyAdmin } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

const MAX_PROMPT_LENGTH = 280;

export async function POST(request: NextRequest) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomId, prompt, authorName } = await request.json();

  if (!roomId || typeof prompt !== "string" || typeof authorName !== "string") {
    return NextResponse.json(
      { error: "roomId, prompt, and authorName are required" },
      { status: 400 },
    );
  }

  if (prompt.trim().length === 0) {
    return NextResponse.json(
      { error: "Prompt cannot be empty" },
      { status: 400 },
    );
  }

  if (prompt.trim().length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or less` },
      { status: 400 },
    );
  }

  if (authorName.trim().length === 0) {
    return NextResponse.json(
      { error: "Author name is required" },
      { status: 400 },
    );
  }

  // Find or create the room doc by room_id field
  const roomsSnap = await adminDb
    .collection("rooms")
    .where("room_id", "==", roomId)
    .limit(1)
    .get();

  if (roomsSnap.empty) {
    // Room doc doesn't exist yet — create it
    const isSchool = roomId.startsWith("school_");
    const schoolName = isSchool
      ? roomId
          .replace("school_", "")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c: string) => c.toUpperCase())
      : null;
    await adminDb.collection("rooms").add({
      room_id: roomId,
      name:
        roomId === "global"
          ? "Global Athlete Room"
          : schoolName
            ? `${schoolName} Room`
            : roomId,
      type: isSchool ? "school" : "global",
      school: schoolName,
      daily_prompt: prompt.trim(),
      daily_prompt_author: authorName.trim(),
      daily_prompt_updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
  } else {
    const roomDoc = roomsSnap.docs[0];
    await roomDoc.ref.update({
      daily_prompt: prompt.trim(),
      daily_prompt_author: authorName.trim(),
      daily_prompt_updated_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    success: true,
    roomId,
    daily_prompt: prompt.trim(),
    daily_prompt_author: authorName.trim(),
  });
}
