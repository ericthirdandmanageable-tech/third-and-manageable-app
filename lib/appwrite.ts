/**
 * Appwrite - Authentication ONLY.
 * All data (profiles, check-ins, game plan, community, etc.) lives in Firebase Firestore.
 * Appwrite provides: session management, user creation, user ID (UID).
 */
import { Account, Client } from "react-native-appwrite";

const client = new Client()
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!)
  .setPlatform(
    process.env.EXPO_PUBLIC_APPWRITE_PLATFORM || "com.thirdandmanageable.app",
  );

export const account = new Account(client);
export default client;
