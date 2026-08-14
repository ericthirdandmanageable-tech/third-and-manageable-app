import { and, eq, isNull } from "drizzle-orm";

import { createAccessToken, normalizeEmail, userJson, verifyPassword } from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { getDb } from "@/lib/db";
import { passwordCredentials, userEmails, users } from "@/lib/db/schema";

export async function POST(request: Request) {
    try {
        const body = await readObject(request);
        const email = stringField(body, "email", { min: 3, max: 320 }) as string;
        const password = stringField(body, "password", { min: 1, max: 1024 }) as string;
        const [row] = await getDb()
            .select({ user: users, email: userEmails.email, passwordHash: passwordCredentials.passwordHash })
            .from(userEmails)
            .innerJoin(users, and(eq(users.id, userEmails.userId), isNull(users.deletedAt)))
            .leftJoin(passwordCredentials, eq(passwordCredentials.userId, users.id))
            .where(eq(userEmails.normalizedEmail, normalizeEmail(email)))
            .limit(1);
        if (!row?.passwordHash || !(await verifyPassword(password, row.passwordHash))) {
            throw new ApiError(401, "Invalid email or password");
        }
        const user = { ...row.user, email: row.email };
        if (user.banned) throw new ApiError(403, "Account banned");
        if (user.suspended) throw new ApiError(403, "Account suspended");
        return Response.json({ access_token: createAccessToken(user), token_type: "bearer", user: userJson(user) });
    } catch (error) {
        return jsonError(error);
    }
}
