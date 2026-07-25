import { verifyAdmin } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { requestId, status } = await request.json();
    if (!requestId || !["pending", "connected", "resolved"].includes(status)) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await adminDb.collection("support_requests").doc(requestId).update({ status });
    return NextResponse.json({ success: true });
}
