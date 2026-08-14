import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { userEmails, users, verificationRequests } from "@/lib/db";
import { withNeonTransaction } from "@/lib/db/transaction";
import { hashVerificationToken } from "@/lib/verification-email";

function profileRedirect(request: Request, result: string) {
    const url = new URL("/profile", request.url);
    url.searchParams.set("verification", result);
    return NextResponse.redirect(url);
}

export async function GET(request: Request) {
    const token = new URL(request.url).searchParams.get("token") ?? "";
    if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
        return profileRedirect(request, "invalid");
    }

    try {
        const result = await withNeonTransaction(async (tx) => {
            const [verificationRequest] = await tx
                .select()
                .from(verificationRequests)
                .where(eq(verificationRequests.tokenHash, hashVerificationToken(token)))
                .limit(1)
                .for("update");
            if (!verificationRequest) return "invalid";
            if (verificationRequest.status === "approved") return "already-confirmed";
            if (verificationRequest.status !== "pending") return "invalid";

            const now = new Date();
            if (!verificationRequest.expiresAt || verificationRequest.expiresAt <= now) {
                await tx
                    .update(verificationRequests)
                    .set({ status: "expired", resolvedAt: now })
                    .where(eq(verificationRequests.id, verificationRequest.id));
                await tx
                    .update(users)
                    .set({ verificationRequested: false, verificationRequestedAt: null })
                    .where(eq(users.id, verificationRequest.userId));
                return "expired";
            }

            const [existingEmail] = await tx
                .select({ id: userEmails.id, userId: userEmails.userId })
                .from(userEmails)
                .where(eq(userEmails.normalizedEmail, verificationRequest.normalizedEmail!))
                .limit(1)
                .for("update");
            if (existingEmail && existingEmail.userId !== verificationRequest.userId) {
                await tx
                    .update(verificationRequests)
                    .set({ status: "cancelled", resolvedAt: now })
                    .where(eq(verificationRequests.id, verificationRequest.id));
                await tx
                    .update(users)
                    .set({ verificationRequested: false, verificationRequestedAt: null })
                    .where(eq(users.id, verificationRequest.userId));
                return "email-in-use";
            }

            if (existingEmail) {
                await tx
                    .update(userEmails)
                    .set({ verified: true, verifiedAt: now })
                    .where(eq(userEmails.id, existingEmail.id));
            } else {
                await tx.insert(userEmails).values({
                    userId: verificationRequest.userId,
                    email: verificationRequest.email!,
                    normalizedEmail: verificationRequest.normalizedEmail!,
                    verified: true,
                    verifiedAt: now,
                    primary: false,
                });
            }

            const [approved] = await tx
                .update(verificationRequests)
                .set({ status: "approved", resolvedAt: now })
                .where(
                    and(
                        eq(verificationRequests.id, verificationRequest.id),
                        eq(verificationRequests.status, "pending"),
                    ),
                )
                .returning({ id: verificationRequests.id });
            if (!approved) return "already-confirmed";

            await tx
                .update(users)
                .set({
                    verified: true,
                    verificationRequested: false,
                    verificationRequestedAt: null,
                    updatedAt: now,
                })
                .where(eq(users.id, verificationRequest.userId));
            return "confirmed";
        });
        return profileRedirect(request, result);
    } catch (error) {
        console.error("University verification confirmation failed", error);
        return profileRedirect(request, "unavailable");
    }
}
