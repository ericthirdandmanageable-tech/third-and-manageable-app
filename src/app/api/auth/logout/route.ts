import { eq, sql } from "drizzle-orm";

import { requireUser } from "@/lib/athlete-api/auth";
import { jsonError } from "@/lib/athlete-api/http";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function POST(request: Request) {
    try {
        const user = await requireUser(request);
        await getDb().update(users).set({
            authVersion: sql`${users.authVersion} + 1`,
            updatedAt: new Date(),
        }).where(eq(users.id, user.id));
        return Response.json({ status: "logged_out" });
    } catch (error) {
        return jsonError(error);
    }
}
