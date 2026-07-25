import { verifyAdmin } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, banned, banType } = await request.json();

    if (!userId || typeof banned !== "boolean") {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (banType === "chat") {
        updateData.chat_banned = banned;
        updateData.chat_banned_at = banned ? new Date().toISOString() : null;
    } else {
        updateData.banned = banned;
        updateData.banned_at = banned ? new Date().toISOString() : null;
    }

    await adminDb.collection("profiles").doc(userId).update(updateData);

    return NextResponse.json({ success: true, banned, banType });
}
