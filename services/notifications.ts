/**
 * Push token service — Firebase Firestore.
 * Collection: "push_tokens" (doc ID = Appwrite user ID for 1:1 mapping).
 */
import { db } from "@/lib/firebase";
import { deleteDoc, doc, setDoc } from "firebase/firestore";

/**
 * Store or update the user's Expo push token in Firestore.
 * Uses userId as the doc ID so there's always exactly one token per user.
 */
export async function storePushToken(
  userId: string,
  token: string,
): Promise<void> {
  try {
    await setDoc(
      doc(db, "push_tokens", userId),
      {
        user_id: userId,
        token,
        updated_at: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch (err) {
    console.error("Failed to store push token:", err);
  }
}

/**
 * Remove the user's push token (e.g., on sign out).
 */
export async function removePushToken(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "push_tokens", userId));
  } catch (err) {
    console.error("Failed to remove push token:", err);
  }
}
