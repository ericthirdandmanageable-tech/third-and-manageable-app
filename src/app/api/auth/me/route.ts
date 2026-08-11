import { requireUser, userJson } from "@/lib/athlete-api/auth";
import { jsonError } from "@/lib/athlete-api/http";

export async function GET(request: Request) {
    try {
        return Response.json(userJson(await requireUser(request)));
    } catch (error) {
        return jsonError(error);
    }
}
