import { requireUser } from "@/lib/athlete-api/auth";
import { clipboardReply, type ClipboardTurn } from "@/lib/athlete-api/clipboard-ai";
import { jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { appendClipboardMessage, listClipboardMessages } from "@/lib/firestore-product";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await readObject(request);
    const message = stringField(body, "message", { min: 1, max: 8_000 });
    const persona = stringField(body, "persona", { optional: true, max: 80 }) ?? "friend";
    await appendClipboardMessage({ userId: user.id, role: "user", text: message, persona });
    const recent = (await listClipboardMessages(user.id)).slice(-20);
    const history = recent.map((row) => ({
      role: row.role === "assistant" ? "ai" : "user",
      text: row.text,
    })) as ClipboardTurn[];
    const reply = await clipboardReply(history, persona, user.id);
    const created = await appendClipboardMessage({
      userId: user.id,
      role: "assistant",
      text: reply.text,
      persona,
    });
    return Response.json({
      id: created.id,
      role: "ai",
      text: created.text,
      persona: created.persona,
      created_at: created.created_at,
      options: reply.options,
    });
  } catch (error) {
    return jsonError(error);
  }
}
