import { clearAdminSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    await clearAdminSession();
    const response = NextResponse.redirect(new URL("/admin/login", request.url));
    response.headers.set("Cache-Control", "no-store");
    return response;
}
