import {
  appwriteServerConfiguration,
  createAppwriteAdminStorage,
} from "@/lib/appwrite-server";
import { requireUser } from "@/lib/athlete-api/auth";
import { ApiError, jsonError } from "@/lib/athlete-api/http";
import { updateProductProfile } from "@/lib/firestore-product";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const form = await request.formData();
    const value = form.get("image");
    if (
      !value ||
      typeof value === "string" ||
      typeof (value as Blob).arrayBuffer !== "function"
    ) {
      throw new ApiError(422, "image is required");
    }
    const upload = value as File;
    if (!ALLOWED_IMAGE_TYPES.has(upload.type)) {
      throw new ApiError(422, "image must be JPEG, PNG, or WebP");
    }
    if (upload.size < 1 || upload.size > MAX_IMAGE_BYTES) {
      throw new ApiError(422, "image must be 4 MB or smaller");
    }

    const extension = upload.type === "image/png" ? "png" : upload.type === "image/webp" ? "webp" : "jpg";
    const bucketId = process.env.APPWRITE_PROFILE_PICTURES_BUCKET_ID?.trim();
    if (!bucketId) throw new Error("Appwrite profile-picture bucket is not configured");
    const storage = createAppwriteAdminStorage();
    await storage.deleteFile({ bucketId, fileId: user.id }).catch((error: { code?: number }) => {
      if (error?.code !== 404) throw error;
    });
    const configuration = appwriteServerConfiguration({ requireApiKey: true });
    const appwriteForm = new FormData();
    appwriteForm.set("fileId", user.id);
    appwriteForm.set("file", upload, `profile.${extension}`);
    appwriteForm.append("permissions[]", 'read("any")');
    const uploaded = await fetch(
      `${configuration.endpoint}/storage/buckets/${encodeURIComponent(bucketId)}/files`,
      {
        method: "POST",
        headers: {
          "X-Appwrite-Key": configuration.apiKey!,
          "X-Appwrite-Project": configuration.projectId,
        },
        body: appwriteForm,
      },
    );
    if (!uploaded.ok) {
      throw new Error(`Appwrite Storage upload failed with HTTP ${uploaded.status}`);
    }
    const profilePicture =
      `${configuration.endpoint}/storage/buckets/${encodeURIComponent(bucketId)}` +
      `/files/${encodeURIComponent(user.id)}/view?project=${encodeURIComponent(configuration.projectId)}`;
    await updateProductProfile(user.id, { profile_pic: profilePicture });
    return Response.json({ profile_pic: profilePicture });
  } catch (error) {
    const diagnostic = error as {
      code?: number | string;
      message?: string;
      name?: string;
      type?: string;
    };
    console.error("Profile picture upload failed", {
      code: diagnostic.code || "unknown",
      name: diagnostic.name || "Error",
      type: diagnostic.type || "unknown",
      message: String(diagnostic.message || "unknown").slice(0, 240),
    });
    return jsonError(error);
  }
}
