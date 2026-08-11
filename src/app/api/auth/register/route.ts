import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";

import {
    athleteApiConfig,
    createAccessToken,
    hashPassword,
    normalizeEmail,
    userJson,
} from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { getDb } from "@/lib/db";
import { athleteProfiles, passwordCredentials, userEmails, users } from "@/lib/db/schema";
import { withNeonTransaction } from "@/lib/db/transaction";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES = new Set(["competing", "transitioning", "transitioned"]);

export async function POST(request: Request) {
    try {
        const body = await readObject(request);
        const email = stringField(body, "email", { min: 3, max: 320 }) as string;
        const password = stringField(body, "password", { min: 8, max: 1024 }) as string;
        const displayName = stringField(body, "display_name", { min: 1, max: 40 }) as string;
        const school = stringField(body, "school", { optional: true, max: 160 });
        const status = (stringField(body, "status", { optional: true }) ?? "transitioning") as string;
        if (!EMAIL.test(email)) throw new ApiError(422, "email must be valid");
        if (!STATUSES.has(status)) throw new ApiError(422, "status is invalid");

        const normalizedEmail = normalizeEmail(email);
        const [existing] = await getDb()
            .select({ id: userEmails.id })
            .from(userEmails)
            .innerJoin(users, and(eq(users.id, userEmails.userId), isNull(users.deletedAt)))
            .where(eq(userEmails.normalizedEmail, normalizedEmail))
            .limit(1);
        if (existing) throw new ApiError(400, "Email already registered");

        const { autoVerify } = athleteApiConfig();
        const userId = randomUUID();
        const passwordHash = await hashPassword(password);
        const now = new Date();
        await withNeonTransaction(async (tx) => {
            await tx.insert(users).values({
                id: userId,
                displayName,
                school: school || null,
                status: status as "competing" | "transitioning" | "transitioned",
                verified: autoVerify,
                createdAt: now,
                updatedAt: now,
            });
            await tx.insert(userEmails).values({
                userId,
                email,
                normalizedEmail,
                primary: true,
                verified: false,
            });
            await tx.insert(passwordCredentials).values({ userId, passwordHash });
            await tx.insert(athleteProfiles).values({ userId });
        });

        const user = {
            id: userId,
            displayName,
            school: school || null,
            status: status as "competing" | "transitioning" | "transitioned",
            headline: null,
            verified: autoVerify,
            verificationRequested: false,
            verificationRequestedAt: null,
            suspended: false,
            suspendedAt: null,
            banned: false,
            bannedAt: null,
            chatBanned: false,
            chatBannedAt: null,
            streak: 0,
            authVersion: 1,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
            email,
        };
        return Response.json({ access_token: createAccessToken(user), token_type: "bearer", user: userJson(user) });
    } catch (error) {
        return jsonError(error);
    }
}
