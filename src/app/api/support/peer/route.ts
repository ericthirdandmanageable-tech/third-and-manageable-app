import { requireUser } from "@/lib/athlete-api/auth";
import { jsonError } from "@/lib/athlete-api/http";
import { getDb } from "@/lib/db";
import { peerSupportRequests } from "@/lib/db/schema";

export async function POST(request: Request) {
    try {
        const user = await requireUser(request);
        await getDb().insert(peerSupportRequests).values({ userId: user.id, status: "notified" });
        return Response.json({ status: "notified", message: "We've notified the community. A peer will reach out soon." });
    } catch (error) {
        return jsonError(error);
    }
}
