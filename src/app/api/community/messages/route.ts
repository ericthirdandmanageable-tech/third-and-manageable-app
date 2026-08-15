import { randomUUID } from "node:crypto";

import { requireUser, requireVerifiedUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { getAdminFirestore } from "@/lib/firebase-admin";
import {
  createProductNotification,
  isoNow,
  listUserDocuments,
} from "@/lib/firestore-product";

function mentionNames(content: string): string[] {
  const names: string[] = [];
  const pattern = /@([A-Za-z][A-Za-z0-9 ]{1,30}?)(?=[,.\s!?;:]|$)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) names.push(match[1].trim());
  return [...new Set(names)];
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const search = new URL(request.url).searchParams;
    const roomId = search.get("room_id")?.trim();
    const maximum = Math.min(Math.max(Number(search.get("limit") || 50), 1), 100);
    if (!roomId || roomId.length > 160) throw new ApiError(422, "room_id is required");
    const [messages, blocks] = await Promise.all([
      getAdminFirestore().collection("messages").where("room_id", "==", roomId).limit(200).get(),
      listUserDocuments<{ blocked_user_id: string }>("user_blocks", user.id, 500),
    ]);
    const blocked = new Set(blocks.map((row) => row.blocked_user_id));
    return Response.json(
      messages.docs
        .map(
          (document): { id: string; user_id?: unknown; created_at?: unknown } &
            Record<string, unknown> => ({ id: document.id, ...document.data() }),
        )
        .filter((message) => !blocked.has(String(message.user_id)))
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .slice(0, maximum),
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireVerifiedUser(request);
    const body = await readObject(request);
    const roomId = stringField(body, "room_id", { min: 1, max: 160 });
    const content = stringField(body, "content", { min: 1, max: 4_000 }).trim();
    const reference = getAdminFirestore().collection("messages").doc(randomUUID());
    const message = {
      room_id: roomId,
      user_id: user.id,
      display_name: user.displayName,
      sport: stringField(body, "sport", { optional: true, max: 80 }) || "other",
      athlete_status: user.status === "competing" ? "current" : "former",
      content,
      verified: user.verified,
      created_at: isoNow(),
    };
    await reference.create(message);
    const database = getAdminFirestore();
    for (const displayName of mentionNames(content).slice(0, 10)) {
      const profiles = await database
        .collection("profiles")
        .where("display_name", "==", displayName)
        .limit(1)
        .get();
      if (profiles.empty || profiles.docs[0].id === user.id) continue;
      await createProductNotification(profiles.docs[0].id, {
        type: "mention",
        title: `${user.displayName} mentioned you`,
        body: "You were mentioned in the community. Tap to see the message.",
        icon: "at",
        related_id: reference.id,
      });
    }
    return Response.json({ id: reference.id, ...message });
  } catch (error) {
    return jsonError(error);
  }
}
