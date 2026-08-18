import { updateAppwriteRecovery } from "@/lib/appwrite-server";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";

export async function POST(request: Request) {
  try {
    const body = await readObject(request);
    const userId = stringField(body, "user_id", { min: 1, max: 128 });
    const secret = stringField(body, "secret", { min: 1, max: 256 });
    const password = stringField(body, "password", { min: 8, max: 256 });
    const passwordConfirmation = stringField(body, "password_confirmation", {
      min: 8,
      max: 256,
    });

    if (password !== passwordConfirmation) {
      throw new ApiError(422, "passwords do not match");
    }

    await updateAppwriteRecovery(userId, secret, password);
    return Response.json({ status: "ok" });
  } catch (error) {
    return jsonError(error);
  }
}
