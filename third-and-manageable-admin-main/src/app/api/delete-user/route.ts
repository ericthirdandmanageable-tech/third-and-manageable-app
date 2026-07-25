import { verifyAdmin } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const isAdmin = await verifyAdmin();
    if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await request.json();

    if (!userId) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Delete user's messages
    const messagesSnap = await adminDb
        .collection("messages")
        .where("user_id", "==", userId)
        .get();

    const batch = adminDb.batch();
    messagesSnap.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    // Delete user's check-ins
    const checkinsSnap = await adminDb
        .collection("checkins")
        .where("user_id", "==", userId)
        .get();
    checkinsSnap.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    // Delete user's game plans
    const gameplansSnap = await adminDb
        .collection("gameplans")
        .where("user_id", "==", userId)
        .get();
    gameplansSnap.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    // Delete user profile
    batch.delete(adminDb.collection("profiles").doc(userId));

    await batch.commit();

    return NextResponse.json({ success: true });
}
