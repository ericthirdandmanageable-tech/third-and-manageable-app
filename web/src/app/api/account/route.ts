import { Users } from "node-appwrite";

import {
  clearAppwriteSessionCookie,
  createAppwriteAdminClient,
  createAppwriteAdminStorage,
} from "@/lib/appwrite-server";
import { requireUser } from "@/lib/athlete-api/auth";
import { jsonError } from "@/lib/athlete-api/http";
import { getAdminAuth } from "@/lib/firebase-admin";
import { deleteProductDataForUser, getProductProfile } from "@/lib/firestore-product";

export async function DELETE(request: Request) {
  try {
    const user = await requireUser(request);
    const profile = await getProductProfile(user.id);
    await deleteProductDataForUser(user.id);
    await getAdminAuth().deleteUser(user.id).catch((error: { code?: string }) => {
      if (error?.code !== "auth/user-not-found") throw error;
    });
    if (profile?.profile_pic) {
      const bucketId = process.env.APPWRITE_PROFILE_PICTURES_BUCKET_ID?.trim();
      if (bucketId) {
        await createAppwriteAdminStorage()
          .deleteFile({ bucketId, fileId: user.id })
          .catch((error: { code?: number }) => {
            if (error?.code !== 404) throw error;
          });
      }
    }
    await new Users(createAppwriteAdminClient()).delete({ userId: user.id });
    await clearAppwriteSessionCookie();
    return Response.json({ status: "deleted" });
  } catch (error) {
    return jsonError(error);
  }
}
