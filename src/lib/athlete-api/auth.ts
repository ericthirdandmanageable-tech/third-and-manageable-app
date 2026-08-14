import { createHmac, timingSafeEqual } from "node:crypto";

import { compare, hash } from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { userEmails, users } from "@/lib/db/schema";

import { ApiError } from "./http";

const DEFAULT_SECRET = "change-me-in-production";
const MIN_SECRET_BYTES = 32;
const TOKEN_LIFETIME_SECONDS = 7 * 24 * 60 * 60;

export type AthleteUser = typeof users.$inferSelect & { email: string | null };

const publicVercelEnvironment = () =>
    ["production", "preview"].includes((process.env.VERCEL_ENV ?? "").trim().toLowerCase());

export function athleteApiConfig() {
    const jwtSecret = process.env.JWT_SECRET ?? DEFAULT_SECRET;
    const autoVerify = (process.env.AUTO_VERIFY ?? "false").trim().toLowerCase() === "true";
    if (
        publicVercelEnvironment() &&
        (jwtSecret === DEFAULT_SECRET || Buffer.byteLength(jwtSecret) < MIN_SECRET_BYTES || autoVerify)
    ) {
        throw new Error("Unsafe athlete API authentication configuration");
    }
    return { jwtSecret, autoVerify: publicVercelEnvironment() ? false : autoVerify };
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const hashPassword = (password: string) => hash(password.slice(0, 72), 12);
export const verifyPassword = (password: string, passwordHash: string) =>
    compare(password.slice(0, 72), passwordHash).catch(() => false);

function encode(value: object): string {
    return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function createAccessToken(user: Pick<AthleteUser, "id" | "authVersion">): string {
    const { jwtSecret } = athleteApiConfig();
    const header = encode({ alg: "HS256", typ: "JWT" });
    const payload = encode({
        sub: user.id,
        av: user.authVersion,
        exp: Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS,
    });
    const input = `${header}.${payload}`;
    const signature = createHmac("sha256", jwtSecret).update(input).digest("base64url");
    return `${input}.${signature}`;
}

export function verifyAccessToken(token: string): { sub: string; av: number } | null {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    try {
        const { jwtSecret } = athleteApiConfig();
        const input = `${parts[0]}.${parts[1]}`;
        // Compare the canonical base64url text, not only decoded bytes. The
        // final base64 character contains unused bits, so two different JWT
        // strings can otherwise decode to the same signature bytes.
        const expected = Buffer.from(
            createHmac("sha256", jwtSecret).update(input).digest("base64url"),
        );
        const actual = Buffer.from(parts[2]);
        if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<string, unknown>;
        if (
            typeof payload.sub !== "string" ||
            !/^[0-9a-f-]{36}$/i.test(payload.sub) ||
            !Number.isInteger(payload.av) ||
            typeof payload.exp !== "number" ||
            payload.exp <= Math.floor(Date.now() / 1000)
        ) return null;
        return { sub: payload.sub, av: payload.av as number };
    } catch {
        return null;
    }
}

export async function findUserById(id: string): Promise<AthleteUser | null> {
    const [row] = await getDb()
        .select({ user: users, email: userEmails.email })
        .from(users)
        .leftJoin(userEmails, and(eq(userEmails.userId, users.id), eq(userEmails.primary, true)))
        .where(and(eq(users.id, id), isNull(users.deletedAt)))
        .limit(1);
    return row ? { ...row.user, email: row.email } : null;
}

function bearerToken(request: Request): string | null {
    const value = request.headers.get("authorization") ?? "";
    const match = /^Bearer\s+(.+)$/i.exec(value);
    return match?.[1] ?? null;
}

export async function optionalUser(request: Request): Promise<AthleteUser | null> {
    const token = bearerToken(request);
    if (!token) return null;
    const claims = verifyAccessToken(token);
    if (!claims) return null;
    const user = await findUserById(claims.sub);
    if (!user || user.authVersion !== claims.av || user.banned || user.suspended) return null;
    return user;
}

export async function requireUser(request: Request): Promise<AthleteUser> {
    const token = bearerToken(request);
    const claims = token ? verifyAccessToken(token) : null;
    if (!claims) throw new ApiError(401, "Not authenticated");
    const user = await findUserById(claims.sub);
    if (!user || user.authVersion !== claims.av) throw new ApiError(401, "Not authenticated");
    if (user.banned) throw new ApiError(403, "Account banned");
    if (user.suspended) throw new ApiError(403, "Account suspended");
    return user;
}

export async function requireVerifiedUser(request: Request): Promise<AthleteUser> {
    const user = await requireUser(request);
    if (!user.verified) throw new ApiError(403, "Athlete verification pending");
    if (user.chatBanned) throw new ApiError(403, "Community access revoked");
    return user;
}

export function userJson(user: AthleteUser) {
    return {
        id: user.id,
        email: user.email,
        display_name: user.displayName,
        school: user.school,
        status: user.status,
        headline: user.headline,
        verified: user.verified,
        verification_requested: user.verificationRequested,
        verification_requested_at: user.verificationRequestedAt?.toISOString() ?? null,
    };
}
