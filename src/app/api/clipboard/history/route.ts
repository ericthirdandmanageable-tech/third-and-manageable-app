import { asc, eq } from "drizzle-orm";

import { requireUser } from "@/lib/athlete-api/auth";
import { jsonError } from "@/lib/athlete-api/http";
import { getDb } from "@/lib/db";
import { clipboardMessages } from "@/lib/db/schema";

export async function GET(request: Request) {
    try {
        const user = await requireUser(request);
        const rows = await getDb().select().from(clipboardMessages)
            .where(eq(clipboardMessages.userId, user.id)).orderBy(asc(clipboardMessages.createdAt));
        return Response.json({ messages: rows.map((row) => ({
            id: row.id,
            role: row.role,
            text: row.text,
            persona: row.persona,
            created_at: row.createdAt,
        })) });
    } catch (error) {
        return jsonError(error);
    }
}

export async function DELETE(request: Request) {
    try {
        const user = await requireUser(request);
        const removed = await getDb().delete(clipboardMessages)
            .where(eq(clipboardMessages.userId, user.id)).returning({ id: clipboardMessages.id });
        return Response.json({ cleared: removed.length });
    } catch (error) {
        return jsonError(error);
    }
}
