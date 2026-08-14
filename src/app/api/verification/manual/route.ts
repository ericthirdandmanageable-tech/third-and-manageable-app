import { randomUUID } from "node:crypto";

import { and, eq, gt } from "drizzle-orm";

import { requireUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { getDb, users, verificationRequests } from "@/lib/db";
import { withNeonTransaction } from "@/lib/db/transaction";
import {
    MANUAL_VERIFICATION_REASONS,
    sendManualVerificationEmails,
    type ManualVerificationReason,
} from "@/lib/verification-email";

const RESEND_COOLDOWN_MS = 10 * 60 * 1_000;

export async function POST(request: Request) {
    try {
        const user = await requireUser(request);
        if (user.verified) throw new ApiError(409, "Account is already verified");

        const body = await readObject(request);
        const reasonCategory = stringField(body, "reason_category", {
            min: 2,
            max: 80,
        }) as ManualVerificationReason;
        const reason = stringField(body, "reason", { optional: true, max: 1_000 })?.trim() || null;
        if (!MANUAL_VERIFICATION_REASONS.includes(reasonCategory)) {
            throw new ApiError(422, "Choose a valid review route");
        }

        const [recent] = await getDb()
            .select({ id: verificationRequests.id })
            .from(verificationRequests)
            .where(
                and(
                    eq(verificationRequests.userId, user.id),
                    eq(verificationRequests.method, "manual"),
                    eq(verificationRequests.status, "pending"),
                    gt(
                        verificationRequests.requestedAt,
                        new Date(Date.now() - RESEND_COOLDOWN_MS),
                    ),
                ),
            )
            .limit(1);
        if (recent) {
            return Response.json({
                status: "pending",
                message: "Your request is already with the verification team.",
            });
        }

        const now = new Date();
        const requestId = randomUUID();
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
                method: "manual",
                reasonCategory,
                reason,
                requestedAt: now,
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

        let notificationSent = true;
        try {
            await sendManualVerificationEmails({
                requestId,
                appUrl: new URL(request.url).origin,
                userId: user.id,
                userEmail: user.email || "No primary email",
                displayName: user.displayName,
                school: user.school,
                reasonCategory,
                reason,
            });
        } catch (error) {
            notificationSent = false;
            console.error("Manual verification notification failed", error);
        }

        return Response.json(
            {
                status: "pending",
                notification_sent: notificationSent,
                message: notificationSent
                    ? "Your request was sent to the verification team. The first admin approval completes it."
                    : "Your request is in the admin queue, but email delivery is temporarily unavailable.",
            },
            { status: notificationSent ? 200 : 202 },
        );
    } catch (error) {
        return jsonError(error);
    }
}
