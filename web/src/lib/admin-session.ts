import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "tm_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

const MINIMUM_PASSWORD_BYTES = 16;
const MINIMUM_SECRET_BYTES = 32;
const SESSION_VERSION = 1;
const SESSION_SUBJECT = "bootstrap-admin";
const MAX_CLOCK_SKEW_SECONDS = 60;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

type AdminSessionPayload = {
    v: typeof SESSION_VERSION;
    sub: typeof SESSION_SUBJECT;
    iat: number;
    exp: number;
};

function nowInSeconds(): number {
    return Math.floor(Date.now() / 1000);
}

function sessionSecret(): string | null {
    const secret = process.env.ADMIN_SESSION_SECRET;
    return secret && Buffer.byteLength(secret, "utf8") >= MINIMUM_SECRET_BYTES
        ? secret
        : null;
}

function configuredPassword(): string | null {
    const password = process.env.ADMIN_PASSWORD;
    return password && Buffer.byteLength(password, "utf8") >= MINIMUM_PASSWORD_BYTES
        ? password
        : null;
}

function digest(value: string): Buffer {
    return createHash("sha256").update(value, "utf8").digest();
}

function sessionSigningKey(): Buffer | null {
    const secret = sessionSecret();
    const password = configuredPassword();
    if (!secret || !password) return null;

    return createHash("sha256")
        .update(secret, "utf8")
        .update("\0", "utf8")
        .update(password, "utf8")
        .digest();
}

function sign(encodedPayload: string, key: Buffer): Buffer {
    return createHmac("sha256", key).update(encodedPayload, "utf8").digest();
}

export function getAdminAuthConfigurationError(): string | null {
    if (!configuredPassword()) {
        return `ADMIN_PASSWORD must contain at least ${MINIMUM_PASSWORD_BYTES} UTF-8 bytes`;
    }
    if (!sessionSecret()) {
        return `ADMIN_SESSION_SECRET must contain at least ${MINIMUM_SECRET_BYTES} UTF-8 bytes`;
    }
    return null;
}

export function isAdminAuthConfigured(): boolean {
    return getAdminAuthConfigurationError() === null;
}

export function verifyAdminPassword(candidate: string): boolean {
    const password = configuredPassword();
    if (!password || typeof candidate !== "string") return false;

    return timingSafeEqual(digest(candidate), digest(password));
}

export function createAdminSessionToken(
    issuedAt = nowInSeconds(),
): string {
    const signingKey = sessionSigningKey();
    if (!signingKey) {
        throw new Error("Admin authentication is not configured");
    }

    const payload: AdminSessionPayload = {
        v: SESSION_VERSION,
        sub: SESSION_SUBJECT,
        iat: issuedAt,
        exp: issuedAt + ADMIN_SESSION_TTL_SECONDS,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
        "base64url",
    );
    const signature = sign(encodedPayload, signingKey).toString("base64url");

    return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(
    token: string | undefined,
    currentTime = nowInSeconds(),
): boolean {
    const signingKey = sessionSigningKey();
    if (!signingKey || !token) return false;

    const segments = token.split(".");
    if (segments.length !== 2 || !segments[0] || !segments[1]) return false;

    const [encodedPayload, encodedSignature] = segments;
    if (
        !BASE64URL_PATTERN.test(encodedPayload) ||
        !BASE64URL_PATTERN.test(encodedSignature)
    ) {
        return false;
    }

    const expectedSignature = sign(encodedPayload, signingKey);
    const suppliedSignature = Buffer.from(encodedSignature, "base64url");
    if (
        suppliedSignature.toString("base64url") !== encodedSignature ||
        suppliedSignature.length !== expectedSignature.length ||
        !timingSafeEqual(suppliedSignature, expectedSignature)
    ) {
        return false;
    }

    let payload: unknown;
    try {
        const payloadBytes = Buffer.from(encodedPayload, "base64url");
        if (payloadBytes.toString("base64url") !== encodedPayload) return false;
        payload = JSON.parse(payloadBytes.toString("utf8"));
    } catch {
        return false;
    }

    if (!payload || typeof payload !== "object") return false;
    const session = payload as Partial<AdminSessionPayload>;

    return (
        session.v === SESSION_VERSION &&
        session.sub === SESSION_SUBJECT &&
        Number.isInteger(session.iat) &&
        Number.isInteger(session.exp) &&
        (session.iat as number) <= currentTime + MAX_CLOCK_SKEW_SECONDS &&
        (session.exp as number) > currentTime &&
        (session.exp as number) - (session.iat as number) ===
            ADMIN_SESSION_TTL_SECONDS
    );
}
