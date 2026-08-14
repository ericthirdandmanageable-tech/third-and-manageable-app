import { requireUser } from "@/lib/athlete-api/auth";
import { jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { getDb } from "@/lib/db";
import { techSupportRequests } from "@/lib/db/schema";

export async function POST(request: Request) {
    try {
        const user = await requireUser(request);
        const body = await readObject(request);
        const message = stringField(body, "message", { min: 3, max: 2_000 }) as string;
        await getDb().insert(techSupportRequests).values({ userId: user.id, message, status: "open" });
        return Response.json({ status: "open", message: "Request sent. We'll be in touch." });
    } catch (error) {
        return jsonError(error);
    }
}
