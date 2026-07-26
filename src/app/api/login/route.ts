import { setAdminSession } from "@/lib/auth";
import {
    getAdminAuthConfigurationError,
    verifyAdminPassword,
} from "@/lib/admin-session";
import { NextRequest, NextResponse } from "next/server";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const MAX_PASSWORD_LENGTH = 1024;

export async function POST(request: NextRequest) {
    const configurationError = getAdminAuthConfigurationError();
    if (configurationError) {
        console.error(`Admin login disabled: ${configurationError}`);
        return NextResponse.json(
            { error: "Admin authentication is unavailable" },
            { status: 503, headers: NO_STORE_HEADERS },
        );
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid request" },
            { status: 400, headers: NO_STORE_HEADERS },
        );
    }

    const password =
        body && typeof body === "object" && "password" in body
            ? (body as { password?: unknown }).password
            : undefined;

    if (
        typeof password !== "string" ||
        password.length === 0 ||
        password.length > MAX_PASSWORD_LENGTH
    ) {
        return NextResponse.json(
            { error: "Invalid credentials" },
            { status: 401, headers: NO_STORE_HEADERS },
        );
    }

    if (verifyAdminPassword(password)) {
        await setAdminSession();
        return NextResponse.json(
            { success: true },
            { headers: NO_STORE_HEADERS },
        );
    }

    return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401, headers: NO_STORE_HEADERS },
    );
}
