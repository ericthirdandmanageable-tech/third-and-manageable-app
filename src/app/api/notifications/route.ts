import { requireUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, uuidField } from "@/lib/athlete-api/http";
import {
  listProductNotifications,
  markProductNotificationRead,
} from "@/lib/firestore-product";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const requested = Number(new URL(request.url).searchParams.get("limit") || 50);
    const maximum = Number.isFinite(requested)
      ? Math.min(Math.max(Math.trunc(requested), 1), 100)
      : 50;
    return Response.json(await listProductNotifications(user.id, maximum));
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await readObject(request);
    const markAll = body.mark_all === true;
    const notificationId = markAll
      ? undefined
      : uuidField(body.notification_id, "notification_id");
    const updated = await markProductNotificationRead(user.id, notificationId);
    if (!markAll && updated === 0) throw new ApiError(404, "Notification not found");
    return Response.json({ updated });
  } catch (error) {
    return jsonError(error);
  }
}
