import { requireUser } from "@/lib/athlete-api/auth";
import { gamePlanFor } from "@/lib/athlete-api/game-plan";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { getPath } from "@/lib/core/paths";
import { updateProductProfile } from "@/lib/firestore-product";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await readObject(request);
    const pathId = stringField(body, "path_id", { nullable: true, max: 120 });
    if (pathId !== null && !getPath(pathId)) throw new ApiError(400, "Unknown path");
    await updateProductProfile(user.id, { committed_path_id: pathId });
    return Response.json(await gamePlanFor(user));
  } catch (error) {
    return jsonError(error);
  }
}
