import { requireUser } from "@/lib/athlete-api/auth";
import { jsonError } from "@/lib/athlete-api/http";
import { clearClipboardMessages, listClipboardMessages } from "@/lib/firestore-product";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const rows = await listClipboardMessages(user.id);
    return Response.json({
      messages: rows.map((row) => ({
        id: row.id,
        role: row.role === "assistant" ? "ai" : "user",
        text: row.text,
        persona: row.persona,
        created_at: row.created_at,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser(request);
    return Response.json({ cleared: await clearClipboardMessages(user.id) });
  } catch (error) {
    return jsonError(error);
  }
}
