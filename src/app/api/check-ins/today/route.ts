import { and, eq } from "drizzle-orm";

import { requireUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { todayISO } from "@/lib/core/journey-math";
import { getDb } from "@/lib/db";
import { checkIns } from "@/lib/db/schema";

const output = (row: typeof checkIns.$inferSelect) => ({
    id: row.id,
    date: row.date,
    prompt_id: row.promptId,
    option: row.option,
    journal: row.journal,
});

export async function GET(request: Request) {
    try {
        const user = await requireUser(request);
        const [row] = await getDb().select().from(checkIns)
            .where(and(eq(checkIns.userId, user.id), eq(checkIns.date, todayISO()))).limit(1);
        return Response.json(row ? output(row) : null);
    } catch (error) {
        return jsonError(error);
    }
}

export async function PATCH(request: Request) {
    try {
        const user = await requireUser(request);
        const body = await readObject(request);
        const option = stringField(body, "option", { optional: true, min: 1, max: 1000 });
        const journal = stringField(body, "journal", { optional: true, max: 20_000 });
        if (option === undefined && journal === undefined) throw new ApiError(422, "No changes provided");
        const values: Partial<typeof checkIns.$inferInsert> = { updatedAt: new Date() };
        if (option !== undefined) values.option = option;
        if (journal !== undefined) values.journal = journal || null;
        const [updated] = await getDb().update(checkIns).set(values)
            .where(and(eq(checkIns.userId, user.id), eq(checkIns.date, todayISO()))).returning();
        if (!updated) throw new ApiError(404, "No check-in today to edit");
        return Response.json(output(updated));
    } catch (error) {
        return jsonError(error);
    }
}
