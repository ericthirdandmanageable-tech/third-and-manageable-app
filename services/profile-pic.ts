/** Profile-picture upload through the authenticated product API. */
import { account } from "@/lib/appwrite";
import { getProductApiBase, MobileApiError } from "@/lib/mobile-api-core";

function imageType(uri: string): "image/jpeg" | "image/png" | "image/webp" {
  const clean = uri.split("?")[0].toLowerCase();
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function uploadProfilePic(
  _userId: string,
  localUri: string,
): Promise<string> {
  const { jwt } = await account.createJWT();
  if (!jwt) throw new Error("Appwrite returned an empty JWT.");
  const type = imageType(localUri);
  const extension = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const body = new FormData();
  body.append(
    "image",
    { uri: localUri, name: `profile.${extension}`, type } as unknown as Blob,
  );
  const response = await fetch(
    `${getProductApiBase(process.env.EXPO_PUBLIC_PRODUCT_API_URL)}/artifacts/profile-picture`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body,
    },
  );
  const payload = (await response.json().catch(() => null)) as
    | { detail?: string; profile_pic?: string }
    | null;
  if (!response.ok || !payload?.profile_pic) {
    throw new MobileApiError(
      response.status,
      payload?.detail || "Profile picture upload failed.",
    );
  }
  return payload.profile_pic;
}
