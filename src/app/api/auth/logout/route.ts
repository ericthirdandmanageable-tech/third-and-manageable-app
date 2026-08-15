import { clearAppwriteSessionCookie, deleteCurrentAppwriteSession } from "@/lib/appwrite-server";
import { jsonError } from "@/lib/athlete-api/http";

export async function POST() {
  try {
    await deleteCurrentAppwriteSession();
    return Response.json({ status: "logged_out" });
  } catch (error) {
    await clearAppwriteSessionCookie();
    return jsonError(error);
  }
}
