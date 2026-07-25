import { cookies } from "next/headers";

const ADMIN_COOKIE = "admin_session";

export async function verifyAdmin(): Promise<boolean> {
    const cookieStore = await cookies();
    const session = cookieStore.get(ADMIN_COOKIE);
    return session?.value === "authenticated";
}

export async function setAdminSession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE, "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
    });
}

export async function clearAdminSession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(ADMIN_COOKIE);
}
