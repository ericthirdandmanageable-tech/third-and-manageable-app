import { requireUser } from "@/lib/athlete-api/auth";
import { gamePlanFor } from "@/lib/athlete-api/game-plan";
import { jsonError } from "@/lib/athlete-api/http";

export async function GET(request: Request) {
    try {
        return Response.json(await gamePlanFor(await requireUser(request)));
    } catch (error) {
        return jsonError(error);
    }
}
