import { NextRequest, NextResponse } from "next/server";
import {
    ADMIN_SESSION_COOKIE,
    verifyAdminSessionToken,
} from "@/lib/admin-session";

export function proxy(request: NextRequest) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (verifyAdminSessionToken(token)) {
        return NextResponse.next();
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
        "next",
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: [
        "/",
        "/users/:path*",
        "/checkins/:path*",
        "/community/:path*",
        "/gameplans/:path*",
        "/support/:path*",
    ],
};
