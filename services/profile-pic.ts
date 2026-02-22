/**
 * Profile picture upload service — Firebase Storage.
 * Uploads user profile images and saves the download URL to Firestore.
 */
import { storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { upsertProfile } from "./auth";

/**
 * Upload a profile picture from a local URI and save the URL to the user's profile.
 * Returns the download URL.
 */
export async function uploadProfilePic(
  userId: string,
  localUri: string,
): Promise<string> {
  // Fetch the image as a blob
  const response = await fetch(localUri);
  const blob = await response.blob();

  // Upload to Firebase Storage under profile_pics/{userId}
  const storageRef = ref(storage, `profile_pics/${userId}`);
  await uploadBytes(storageRef, blob);

  // Get the download URL
  const downloadUrl = await getDownloadURL(storageRef);

  // Save to Firestore profile
  await upsertProfile({ id: userId, profile_pic: downloadUrl });

  return downloadUrl;
}
