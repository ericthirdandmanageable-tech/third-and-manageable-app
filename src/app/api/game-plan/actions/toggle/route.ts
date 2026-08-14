import { and, eq } from "drizzle-orm";

import { requireUser } from "@/lib/athlete-api/auth";
import { currentWeekMonday, gamePlanFor } from "@/lib/athlete-api/game-plan";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { categoryForAction } from "@/lib/core/actions";
import { actionCompletions } from "@/lib/db/schema";
import { withNeonTransaction } from "@/lib/db/transaction";

export async function POST(request: Request) {
    try {
        const user = await requireUser(request);
        const body = await readObject(request);
        const actionId = stringField(body, "action_id", { min: 1, max: 120 }) as string;
        const category = categoryForAction(actionId);
        if (!category) throw new ApiError(400, "Unknown action");
        const weekOf = currentWeekMonday();
        await withNeonTransaction(async (tx) => {
            const [existing] = await tx.select({ id: actionCompletions.id }).from(actionCompletions).where(and(
                eq(actionCompletions.userId, user.id),
                eq(actionCompletions.actionId, actionId),
                eq(actionCompletions.weekOf, weekOf),
            )).limit(1);
            if (existing) {
                await tx.delete(actionCompletions).where(eq(actionCompletions.id, existing.id));
            } else {
                await tx.insert(actionCompletions).values({ userId: user.id, actionId, category, weekOf });
            }
        });
        return Response.json(await gamePlanFor(user));
    } catch (error) {
        return jsonError(error);
    }
}
