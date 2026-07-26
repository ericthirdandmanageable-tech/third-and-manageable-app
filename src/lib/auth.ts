import { cookies } from "next/headers";
import {
    ADMIN_SESSION_COOKIE,
    ADMIN_SESSION_TTL_SECONDS,
    createAdminSessionToken,
    verifyAdminSessionToken,
} from "@/lib/admin-session";

const LEGACY_ADMIN_COOKIE = "admin_session";

export async function verifyAdmin(): Promise<boolean> {
    const cookieStore = await cookies();
    return verifyAdminSessionToken(
        cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
    );
}

export async function setAdminSession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: ADMIN_SESSION_TTL_SECONDS,
        path: "/",
        priority: "high",
    });
    cookieStore.delete(LEGACY_ADMIN_COOKIE);
}

export async function clearAdminSession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(ADMIN_SESSION_COOKIE);
    cookieStore.delete(LEGACY_ADMIN_COOKIE);
}
