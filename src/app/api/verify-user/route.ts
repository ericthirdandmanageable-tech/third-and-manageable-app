import { verifyAdmin } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, verified } = await request.json();

    if (!userId || typeof verified !== "boolean") {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await adminDb.collection("profiles").doc(userId).update({ verified });

    return NextResponse.json({ success: true, verified });
}
