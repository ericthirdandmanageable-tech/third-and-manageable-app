import { requireUser } from "@/lib/athlete-api/auth";
import { listPostRows, postJson } from "@/lib/athlete-api/community";
import { ApiError, jsonError } from "@/lib/athlete-api/http";

export async function GET(request: Request) {
    try {
        const user = await requireUser(request);
        const search = new URL(request.url).searchParams;
        const scope = search.get("scope") ?? "joined";
        const sort = search.get("sort") ?? "hot";
        if (!["joined", "all"].includes(scope) || !["hot", "new", "top"].includes(sort)) {
            throw new ApiError(422, "Invalid feed options");
        }
        const rows = await listPostRows({
            userId: user.id,
            scope: scope as "joined" | "all",
            sort: sort as "hot" | "new" | "top",
        });
        return Response.json(rows.map(postJson));
    } catch (error) {
        return jsonError(error);
    }
}
