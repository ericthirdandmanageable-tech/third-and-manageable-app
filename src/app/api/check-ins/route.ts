import { and, desc, eq } from "drizzle-orm";

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
        const rows = await getDb().select().from(checkIns)
            .where(eq(checkIns.userId, user.id)).orderBy(desc(checkIns.date)).limit(90);
        return Response.json(rows.map(output));
    } catch (error) {
        return jsonError(error);
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireUser(request);
        const body = await readObject(request);
        const promptId = stringField(body, "prompt_id", { min: 1, max: 240 }) as string;
        const promptQuestion = stringField(body, "prompt_question", { min: 1, max: 4000 }) as string;
        const option = stringField(body, "option", { min: 1, max: 1000 }) as string;
        const journal = stringField(body, "journal", { optional: true, max: 20_000 });
        const ambient = body.ambient === undefined ? null : body.ambient;
        if (ambient !== null && (typeof ambient !== "object" || Array.isArray(ambient))) {
            throw new ApiError(422, "ambient must be an object");
        }
        const date = todayISO();
        const [existing] = await getDb().select({ id: checkIns.id }).from(checkIns)
            .where(and(eq(checkIns.userId, user.id), eq(checkIns.date, date))).limit(1);
        if (existing) throw new ApiError(409, "Already checked in today");
        const [created] = await getDb().insert(checkIns).values({
            userId: user.id,
            date,
            promptId,
            promptQuestion,
            option,
            journal: journal || null,
            ambient: ambient as Record<string, unknown> | null,
        }).returning();
        return Response.json(output(created));
    } catch (error) {
        return jsonError(error);
    }
}
