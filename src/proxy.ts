import { NextRequest, NextResponse } from "next/server";
import {
    ADMIN_SESSION_COOKIE,
    verifyAdminSessionToken,
} from "@/lib/admin-session";

export const ADMIN_LOGIN_PATH = "/admin/login";

export function proxy(request: NextRequest) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (verifyAdminSessionToken(token)) {
        return NextResponse.next();
    }

    const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
    loginUrl.searchParams.set(
        "next",
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
}

// Optimistic routing protection only (§2.0, §6.7): the `(dashboard)` layout and
// every privileged Route Handler repeat the check server-side, because a proxy
// cannot be the authority on authorization.
//
// The matcher covers all of /admin — including routes that do not exist yet, so
// a new admin page is protected the moment it is added — except `/admin/login`,
// which is the page this proxy redirects *to*. Gating that would loop forever.
export const config = {
    matcher: ["/admin", "/admin/((?!login$|login\\?).*)"],
};
