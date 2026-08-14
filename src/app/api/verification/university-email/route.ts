import { randomUUID } from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";

import { normalizeEmail, requireUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { getDb, userEmails, users, verificationRequests } from "@/lib/db";
import { withNeonTransaction } from "@/lib/db/transaction";
import {
    createVerificationToken,
    hashVerificationToken,
    isUniversityEmail,
    sendUniversityConfirmationEmail,
} from "@/lib/verification-email";

const LINK_LIFETIME_MS = 24 * 60 * 60 * 1_000;
const RESEND_COOLDOWN_MS = 5 * 60 * 1_000;

export async function POST(request: Request) {
    try {
        const user = await requireUser(request);
        if (user.verified) throw new ApiError(409, "Account is already verified");

        const body = await readObject(request);
        const email = stringField(body, "email", { min: 5, max: 320 }) as string;
        const normalizedEmail = normalizeEmail(email);
        if (!isUniversityEmail(normalizedEmail)) {
            throw new ApiError(422, "Use a valid .edu email address");
        }

        const [owner, recent] = await Promise.all([
            getDb()
                .select({ userId: userEmails.userId })
                .from(userEmails)
                .innerJoin(users, and(eq(users.id, userEmails.userId), isNull(users.deletedAt)))
                .where(eq(userEmails.normalizedEmail, normalizedEmail))
                .limit(1),
            getDb()
                .select({ id: verificationRequests.id })
                .from(verificationRequests)
                .where(
                    and(
                        eq(verificationRequests.userId, user.id),
                        eq(verificationRequests.method, "university_email"),
                        eq(verificationRequests.status, "pending"),
                        gt(
                            verificationRequests.requestedAt,
                            new Date(Date.now() - RESEND_COOLDOWN_MS),
                        ),
                    ),
                )
                .limit(1),
        ]);
        if (owner[0] && owner[0].userId !== user.id) {
            throw new ApiError(409, "That university email belongs to another account");
        }
        if (recent[0]) {
            throw new ApiError(429, "A confirmation email was just sent. Try again in a few minutes.");
        }

        const now = new Date();
        const requestId = randomUUID();
        const token = createVerificationToken();
        await withNeonTransaction(async (tx) => {
            await tx
                .update(verificationRequests)
                .set({ status: "cancelled", resolvedAt: now })
                .where(
                    and(
                        eq(verificationRequests.userId, user.id),
                        eq(verificationRequests.status, "pending"),
                    ),
                );
            await tx.insert(verificationRequests).values({
                id: requestId,
                userId: user.id,
                method: "university_email",
                email: email.trim(),
                normalizedEmail,
                tokenHash: hashVerificationToken(token),
                requestedAt: now,
                expiresAt: new Date(now.getTime() + LINK_LIFETIME_MS),
            });
            await tx
                .update(users)
                .set({
                    verificationRequested: true,
                    verificationRequestedAt: now,
                    updatedAt: now,
                })
                .where(eq(users.id, user.id));
        });

        const confirmationUrl = new URL("/api/verification/confirm", request.url);
        confirmationUrl.searchParams.set("token", token);
        try {
            await sendUniversityConfirmationEmail({
                requestId,
                to: email.trim(),
                displayName: user.displayName,
                confirmationUrl: confirmationUrl.toString(),
            });
        } catch (error) {
            console.error("University verification email failed", error);
            await withNeonTransaction(async (tx) => {
                await tx
                    .update(verificationRequests)
                    .set({ status: "cancelled", resolvedAt: new Date() })
                    .where(
                        and(
                            eq(verificationRequests.id, requestId),
                            eq(verificationRequests.status, "pending"),
                        ),
                    );
                const [pending] = await tx
                    .select({ id: verificationRequests.id })
                    .from(verificationRequests)
                    .where(
                        and(
                            eq(verificationRequests.userId, user.id),
                            eq(verificationRequests.status, "pending"),
                        ),
                    )
                    .limit(1);
                if (!pending) {
                    await tx
                        .update(users)
                        .set({ verificationRequested: false, verificationRequestedAt: null })
                        .where(eq(users.id, user.id));
                }
            });
            throw new ApiError(503, "We could not send the confirmation email. Please try again.");
        }

        return Response.json({
            status: "pending",
            message: `Confirmation sent to ${email.trim()}. The link expires in 24 hours.`,
        });
    } catch (error) {
        return jsonError(error);
    }
}
