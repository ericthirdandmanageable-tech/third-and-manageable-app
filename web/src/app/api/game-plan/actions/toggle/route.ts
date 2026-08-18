import { requireUser } from "@/lib/athlete-api/auth";
import { currentWeekMonday, gamePlanFor } from "@/lib/athlete-api/game-plan";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { categoryForAction } from "@/lib/core/actions";
import { createProductNotification, toggleCompletion } from "@/lib/firestore-product";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await readObject(request);
    const actionId = stringField(body, "action_id", { min: 1, max: 120 });
    const category = categoryForAction(actionId);
    if (!category) throw new ApiError(400, "Unknown action");
    const completed = await toggleCompletion({
      userId: user.id,
      actionId,
      category,
      weekOf: currentWeekMonday(),
    });
    if (completed) {
      await createProductNotification(user.id, {
        type: "gameplan",
        title: "Game Plan Completed",
        body: "You crushed today's action. One step closer to your next chapter.",
        icon: "clipboard",
      });
    }
    return Response.json(await gamePlanFor(user));
  } catch (error) {
    return jsonError(error);
  }
}
