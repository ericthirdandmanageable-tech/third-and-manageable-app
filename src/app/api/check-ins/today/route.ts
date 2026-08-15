import { requireUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { todayISO } from "@/lib/core/journey-math";
import { listCheckIns, updateCheckIn } from "@/lib/firestore-product";

const output = (row: Awaited<ReturnType<typeof listCheckIns>>[number]) => ({
  id: row.id,
  date: row.date,
  prompt_id: row.prompt_id,
  option: row.option,
  journal: row.journal,
  user_id: row.user_id,
  mood: row.mood,
  note: row.note,
  ai_response: row.ai_response,
  created_at: row.created_at,
});

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const row = (await listCheckIns(user.id)).find((entry) => entry.date === todayISO());
    return Response.json(row ? output(row) : null);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await readObject(request);
    const option = stringField(body, "option", { optional: true, min: 1, max: 1_000 });
    const journal = stringField(body, "journal", { optional: true, max: 20_000 });
    if (option === undefined && journal === undefined) throw new ApiError(422, "No changes provided");
    const updated = await updateCheckIn(user.id, todayISO(), {
      option,
      journal: journal === undefined ? undefined : journal || null,
    });
    if (!updated) throw new ApiError(404, "No check-in today to edit");
    return Response.json(output(updated));
  } catch (error) {
    return jsonError(error);
  }
}
