import { setAdminSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const { password } = await request.json();

    if (password === process.env.ADMIN_PASSWORD) {
        await setAdminSession();
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}
