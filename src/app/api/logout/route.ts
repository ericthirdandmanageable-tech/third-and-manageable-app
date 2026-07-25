import { clearAdminSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
    await clearAdminSession();
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"));
}
