import { eq } from "drizzle-orm";

import { requireUser } from "@/lib/athlete-api/auth";
import { gamePlanFor } from "@/lib/athlete-api/game-plan";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { getPath } from "@/lib/core/paths";
import { getDb } from "@/lib/db";
import { commitments } from "@/lib/db/schema";

export async function POST(request: Request) {
    try {
        const user = await requireUser(request);
        const body = await readObject(request);
        const pathId = stringField(body, "path_id", { nullable: true, max: 120 });
        if (pathId !== null && !getPath(pathId)) throw new ApiError(400, "Unknown path");
        if (pathId === null) {
            await getDb().delete(commitments).where(eq(commitments.userId, user.id));
        } else {
            await getDb().insert(commitments).values({ userId: user.id, pathId })
                .onConflictDoUpdate({ target: commitments.userId, set: { pathId, updatedAt: new Date() } });
        }
        return Response.json(await gamePlanFor(user));
    } catch (error) {
        return jsonError(error);
    }
}
