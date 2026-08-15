import { requireVerifiedUser } from "@/lib/athlete-api/auth";
import { toggleCommunityVote } from "@/lib/athlete-api/community";
import { ApiError, jsonError, readObject, stringField, uuidField } from "@/lib/athlete-api/http";

export async function POST(request: Request) {
  try {
    const user = await requireVerifiedUser(request);
    const body = await readObject(request);
    const targetType = stringField(body, "target_type", { min: 1, max: 20 });
    const targetId = uuidField(body.target_id, "target_id");
    if (targetType !== "post" && targetType !== "comment") {
      throw new ApiError(422, "target_type is invalid");
    }
    const result = await toggleCommunityVote({ userId: user.id, targetType, targetId });
    if (!result) throw new ApiError(404, "Target not found");
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
