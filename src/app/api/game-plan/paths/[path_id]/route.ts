import { requireUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError } from "@/lib/athlete-api/http";
import { getPath } from "@/lib/core/paths";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ path_id: string }> },
) {
    try {
        await requireUser(request);
        const { path_id: pathId } = await params;
        const path = getPath(pathId);
        if (!path) throw new ApiError(404, "Path not found");
        return Response.json({
            id: path.id,
            name: path.name,
            icon: path.id,
            tagline: path.tagline,
            schedule_shape: path.scheduleShape,
            income_texture: path.incomeTexture,
            loves: path.loves,
            hates: path.hates,
            first_reps: path.firstReps,
            meta: path.meta,
            fit: path.fit,
            forum_id: `path-${path.id}`,
        });
    } catch (error) {
        return jsonError(error);
    }
}
