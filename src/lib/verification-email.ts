import { createHash, randomBytes } from "node:crypto";

import nodemailer from "nodemailer";
import { Resend } from "resend";

const DEFAULT_ADMIN_EMAIL = "lucas@lingiq.ai";

export const MANUAL_VERIFICATION_REASONS = [
    "no_school_email",
    "non_collegiate_athlete",
    "school_without_edu",
    "coach_or_support_staff",
    "other",
] as const;

export type ManualVerificationReason = (typeof MANUAL_VERIFICATION_REASONS)[number];

export const MANUAL_VERIFICATION_LABELS: Record<ManualVerificationReason, string> = {
    no_school_email: "No longer have access to a school email",
    non_collegiate_athlete: "Competed outside a college or university",
    school_without_edu: "School does not use a .edu domain",
    coach_or_support_staff: "Coach, staff, or athlete-support professional",
    other: "Another situation",
};

export function isUniversityEmail(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    return /^[^\s@]+@(?:[a-z0-9-]+\.)+edu$/i.test(normalized);
}

export function createVerificationToken(): string {
    return randomBytes(32).toString("base64url");
}

export function hashVerificationToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export function verificationAdminEmails(
    raw = process.env.VERIFICATION_ADMIN_EMAILS,
): string[] {
    const candidates = (raw?.trim() ? raw : DEFAULT_ADMIN_EMAIL).split(/[;,]/);
    const recipients = [
        ...new Set(candidates.map((email) => email.trim().toLowerCase()).filter(Boolean)),
    ];
    return recipients.length ? recipients : [DEFAULT_ADMIN_EMAIL];
}

export type VerificationEmailTransport = "resend" | "gmail_smtp";

export function verificationEmailTransport(
    raw = process.env.VERIFICATION_EMAIL_TRANSPORT,
): VerificationEmailTransport {
    const transport = raw?.trim().toLowerCase() || "resend";
    if (transport !== "resend" && transport !== "gmail_smtp") {
        throw new Error(`Unsupported verification email transport: ${transport}`);
    }
    return transport;
}

type VerificationMessage = {
    to: string;
    subject: string;
    html: string;
    messageId: string;
};

async function sendVerificationMessages(
    messages: VerificationMessage[],
    idempotencyKey: string,
): Promise<void> {
    if (verificationEmailTransport() === "gmail_smtp") {
        const user = process.env.GMAIL_SMTP_USER?.trim();
        const password = process.env.GMAIL_SMTP_APP_PASSWORD?.replace(/\s/g, "");
        if (!user || !password) {
            throw new Error(
                "Gmail SMTP is not configured: set GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD",
            );
        }
        const from =
            process.env.VERIFICATION_FROM_EMAIL?.trim() ||
            `Third & Manageable <${user}>`;
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user, pass: password },
        });
        try {
            await Promise.all(
                messages.map((message) =>
                    transporter.sendMail({
                        from,
                        to: message.to,
                        subject: message.subject,
                        html: message.html,
                        messageId: message.messageId,
                    }),
                ),
            );
        } finally {
            transporter.close();
        }
        return;
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.VERIFICATION_FROM_EMAIL?.trim();
    if (!apiKey || !from) {
        throw new Error(
            "Verification email is not configured: set RESEND_API_KEY and VERIFICATION_FROM_EMAIL",
        );
    }
    const resend = new Resend(apiKey);
    if (messages.length === 1) {
        const [message] = messages;
        const { error } = await resend.emails.send(
            {
                from,
                to: message.to,
                subject: message.subject,
                html: message.html,
            },
            { idempotencyKey },
        );
        if (error) throw new Error(`Resend email failed: ${error.message}`);
        return;
    }

    const { error } = await resend.batch.send(
        messages.map((message) => ({
            from,
            to: message.to,
            subject: message.subject,
            html: message.html,
        })),
        { idempotencyKey },
    );
    if (error) throw new Error(`Resend email batch failed: ${error.message}`);
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => {
        const entities: Record<string, string> = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;",
        };
        return entities[character];
    });
}

function emailFrame(content: string): string {
    return `<!doctype html><html><body style="margin:0;background:#101719;color:#f4efe3;font-family:Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:40px 24px"><p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#bbf451">Third &amp; Manageable</p>${content}<p style="margin-top:32px;font-size:12px;line-height:1.6;color:#9aa5a6">This is an account-security message. If you did not request it, you can ignore it.</p></div></body></html>`;
}

export async function sendUniversityConfirmationEmail(input: {
    requestId: string;
    to: string;
    displayName: string;
    confirmationUrl: string;
}): Promise<void> {
    await sendVerificationMessages(
        [
            {
                to: input.to,
                subject: "Confirm your university email",
                html: emailFrame(`
                <h1 style="font:italic 32px Georgia,serif;margin:18px 0;color:#f4efe3">Confirm your account</h1>
                <p style="font-size:16px;line-height:1.6;color:#d3d9d5">Hi ${escapeHtml(input.displayName)}, confirm that you own this university email to unlock verified community access.</p>
                <p style="margin:28px 0"><a href="${escapeHtml(input.confirmationUrl)}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:#bbf451;color:#102018;text-decoration:none;font-weight:700">Confirm university email</a></p>
                <p style="font-size:13px;line-height:1.6;color:#9aa5a6">This private link expires in 24 hours and can be used once.</p>
            `),
                messageId: `<university-verification-${input.requestId}@thirdandmanageable.app>`,
            },
        ],
        `university-verification-${input.requestId}`,
    );
}

export async function sendManualVerificationEmails(input: {
    requestId: string;
    appUrl: string;
    userId: string;
    userEmail: string;
    displayName: string;
    school: string | null;
    reasonCategory: ManualVerificationReason;
    reason: string | null;
}): Promise<void> {
    const recipients = verificationAdminEmails();
    const reviewUrl = new URL("/admin/users", input.appUrl);
    reviewUrl.searchParams.set("search", input.userEmail);

    const reasonLabel = MANUAL_VERIFICATION_LABELS[input.reasonCategory];
    const note = input.reason
        ? `<p style="font-size:14px;line-height:1.6;color:#d3d9d5"><strong>Note:</strong> ${escapeHtml(input.reason)}</p>`
        : "";
    const html = emailFrame(`
        <h1 style="font:italic 30px Georgia,serif;margin:18px 0;color:#f4efe3">Please verify my account</h1>
        <p style="font-size:16px;line-height:1.6;color:#d3d9d5"><strong>${escapeHtml(input.displayName)}</strong> requested a manual verification review.</p>
        <p style="font-size:14px;line-height:1.7;color:#d3d9d5"><strong>Email:</strong> ${escapeHtml(input.userEmail)}<br><strong>School:</strong> ${escapeHtml(input.school || "Not provided")}<br><strong>Route:</strong> ${escapeHtml(reasonLabel)}</p>
        ${note}
        <p style="margin:28px 0"><a href="${escapeHtml(reviewUrl.toString())}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:#bbf451;color:#102018;text-decoration:none;font-weight:700">Review verification request</a></p>
        <p style="font-size:13px;line-height:1.6;color:#9aa5a6">Every verification admin received this request. The first approval completes it for everyone.</p>
    `);

    await sendVerificationMessages(
        recipients.map((to, index) => ({
            to,
            subject: `Verification request: ${input.displayName}`,
            html,
            messageId: `<manual-verification-${input.requestId}-${index}@thirdandmanageable.app>`,
        })),
        `manual-verification-${input.requestId}`,
    );
}
