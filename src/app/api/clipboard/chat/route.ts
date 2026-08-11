import { desc, eq } from "drizzle-orm";

import { requireUser } from "@/lib/athlete-api/auth";
import { clipboardReply, type ClipboardTurn } from "@/lib/athlete-api/clipboard-ai";
import { jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { getDb } from "@/lib/db";
import { clipboardMessages } from "@/lib/db/schema";

export async function POST(request: Request) {
    try {
        const user = await requireUser(request);
        const body = await readObject(request);
        const message = stringField(body, "message", { min: 1, max: 8_000 }) as string;
        const persona = (stringField(body, "persona", { optional: true, max: 80 }) ?? "friend") as string;
        await getDb().insert(clipboardMessages).values({
            userId: user.id,
            role: "user",
            text: message,
            persona,
        });
        const recent = await getDb().select({
            role: clipboardMessages.role,
            text: clipboardMessages.text,
        }).from(clipboardMessages).where(eq(clipboardMessages.userId, user.id))
            .orderBy(desc(clipboardMessages.createdAt)).limit(20);
        const history = recent.reverse().map((row) => ({ role: row.role, text: row.text })) as ClipboardTurn[];
        const reply = await clipboardReply(history, persona, user.id);
        const [created] = await getDb().insert(clipboardMessages).values({
            userId: user.id,
            role: "ai",
            text: reply.text,
            persona,
        }).returning();
        return Response.json({
            id: created.id,
            role: "ai",
            text: created.text,
            persona: created.persona,
            created_at: created.createdAt,
            options: reply.options,
        });
    } catch (error) {
        return jsonError(error);
    }
}
