/**
 * Auth service: Appwrite for authentication, Firebase Firestore for profile data.
 * The Appwrite user.$id is the universal UID used as the Firestore document ID.
 */
import { account } from "@/lib/appwrite";
import { db, storage } from "@/lib/firebase";
import { Profile } from "@/types";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  DocumentData,
  DocumentReference,
  Query as FirestoreQuery,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { ID, OAuthProvider } from "react-native-appwrite";

const USER_OWNED_COLLECTIONS = [
  "checkins",
  "completions",
  "messages",
  "support_requests",
  "notifications",
];

const SESSION_VERIFY_MAX_ATTEMPTS = 6;
const SESSION_VERIFY_BASE_DELAY_MS = 250;

async function upsertIdentityProfile(userId: string, email?: string | null) {
  const payload: { user_id: string; email?: string } = { user_id: userId };
  if (email) payload.email = email;

  await setDoc(doc(db, "profiles", userId), payload, { merge: true });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getCurrentUserWithRetry(
  maxAttempts = SESSION_VERIFY_MAX_ATTEMPTS,
): Promise<Awaited<ReturnType<typeof account.get>> | null> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await account.get();
    } catch (err: any) {
      lastError = err;
      const message = String(err?.message || "").toLowerCase();
      const retryable =
        err?.code === 401 ||
        message.includes("missing scopes") ||
        message.includes("role: guests");

      if (!retryable || attempt === maxAttempts) {
        break;
      }

      await delay(SESSION_VERIFY_BASE_DELAY_MS * attempt);
    }
  }

  if (lastError) {
    throw lastError;
  }
  return null;
}

function buildOAuthDeepLink(): string {
  const generatedDeepLink = Linking.createURL("/");
  try {
    const parsed = new URL(generatedDeepLink);
    const scheme = parsed.protocol.replace(":", "");
    if (scheme === "exp") {
      return generatedDeepLink;
    }
    return `${scheme}://localhost/`;
  } catch {
    const fallbackScheme = generatedDeepLink.split("://")[0];
    if (fallbackScheme === "exp") {
      return generatedDeepLink;
    }
    return `${fallbackScheme}://localhost/`;
  }
}

function getOAuthCallbackUrl(fallbackDeepLink: string): string {
  const configuredBridgeUrl = process.env.EXPO_PUBLIC_OAUTH_BRIDGE_URL?.trim();
  if (!configuredBridgeUrl) return fallbackDeepLink;

  if (
    configuredBridgeUrl.startsWith("https://") ||
    configuredBridgeUrl.startsWith("http://")
  ) {
    return configuredBridgeUrl;
  }

  throw new Error(
    "EXPO_PUBLIC_OAUTH_BRIDGE_URL must start with http:// or https://",
  );
}

async function signInWithOAuth(
  provider: OAuthProvider,
  providerName: string,
) {
  const deepLink = buildOAuthDeepLink();
  const callbackUrl = getOAuthCallbackUrl(deepLink);
  if (__DEV__) {
    console.log(
      `[OAuth] provider=${providerName} deepLink=${deepLink} callbackUrl=${callbackUrl}`,
    );
  }

  let loginUrl: void | URL;
  try {
    loginUrl = await account.createOAuth2Token(
      provider,
      callbackUrl,
      callbackUrl,
    );
  } catch (err: any) {
    throw new Error(
      `OAuth redirect rejected. URL used: ${callbackUrl}. Add that host as an Appwrite Web platform and ensure native platform IDs are registered. ${err?.message || ""}`.trim(),
    );
  }

  if (!loginUrl) {
    throw new Error(`Failed to create ${providerName} sign-in URL.`);
  }

  const result = await WebBrowser.openAuthSessionAsync(String(loginUrl), deepLink);

  if (result.type !== "success" || !result.url) {
    throw new Error(`${providerName} sign-in was cancelled.`);
  }

  const url = new URL(result.url);
  const userId = url.searchParams.get("userId");
  const secret = url.searchParams.get("secret");

  if (!userId || !secret) {
    throw new Error(`${providerName} sign-in failed - missing credentials.`);
  }

  await account.createSession(userId, secret);
  const user = await account.get();
  await upsertIdentityProfile(user.$id, user.email);
  return user;
}

async function deleteDocsByQuery(
  queryRef: FirestoreQuery<DocumentData>,
): Promise<void> {
  const snapshot = await getDocs(queryRef);
  if (snapshot.empty) return;

  let batch = writeBatch(db);
  let operationCount = 0;

  for (const snapshotDoc of snapshot.docs) {
    batch.delete(snapshotDoc.ref);
    operationCount += 1;

    if (operationCount >= 450) {
      await batch.commit();
      batch = writeBatch(db);
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }
}

async function deleteDocRefs(refs: DocumentReference<DocumentData>[]) {
  if (!refs.length) return;

  let batch = writeBatch(db);
  let operationCount = 0;

  for (const docRef of refs) {
    batch.delete(docRef);
    operationCount += 1;

    if (operationCount >= 450) {
      await batch.commit();
      batch = writeBatch(db);
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }
}

export async function signUp(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
) {
  // Clear any stale session so Appwrite treats us as a guest (required for account.create)
  try {
    await account.deleteSession("current");
  } catch {
    // No active session expected for fresh registrations.
  }

  let createdUserId: string | null = null;
  try {
    const created = await account.create(
      ID.unique(),
      email,
      password,
      `${firstName} ${lastName}`,
    );
    createdUserId = created.$id;
  } catch (err: any) {
    const rawMessage = String(err?.message || "");
    const isAlreadyExists =
      rawMessage.toLowerCase().includes("already exists") ||
      rawMessage.toLowerCase().includes("already registered");

    if (!isAlreadyExists) {
      throw err;
    }
  }

  const session = await account.createEmailPasswordSession(email, password);
  const userId = createdUserId || session.userId;
  await upsertIdentityProfile(userId, email);

  try {
    return await getCurrentUserWithRetry();
  } catch {
    // Account and session were created; caller will refresh auth state next.
    return null;
  }
}

export async function signIn(email: string, password: string) {
  const session = await account.createEmailPasswordSession(email, password);
  await upsertIdentityProfile(session.userId, email);

  try {
    return await getCurrentUserWithRetry();
  } catch {
    // Session exists even if immediate verification fails temporarily.
    return null;
  }
}

export async function signInWithGoogle() {
  return await signInWithOAuth(OAuthProvider.Google, "Google");
}

export async function signInWithApple() {
  return await signInWithOAuth(OAuthProvider.Apple, "Apple");
}

export async function signOut() {
  await account.deleteSession("current");
}

export async function getCurrentUser() {
  try {
    return await getCurrentUserWithRetry();
  } catch {
    return null;
  }
}

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const snap = await getDoc(doc(db, "profiles", userId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Profile;
  } catch {
    return null;
  }
}

export async function upsertProfile(
  profile: Partial<Profile> & { id: string },
) {
  const { id, ...data } = profile;
  await setDoc(
    doc(db, "profiles", id),
    { ...data, user_id: id },
    { merge: true },
  );
  const snap = await getDoc(doc(db, "profiles", id));
  return { id: snap.id, ...snap.data() } as Profile;
}

export async function deleteAccount(): Promise<void> {
  const user = await account.get();
  const userId = user.$id;

  for (const collectionName of USER_OWNED_COLLECTIONS) {
    await deleteDocsByQuery(
      query(collection(db, collectionName), where("user_id", "==", userId)),
    );
  }

  await deleteDocsByQuery(
    query(collection(db, "content_reports"), where("reporter_id", "==", userId)),
  );
  await deleteDocsByQuery(
    query(
      collection(db, "content_reports"),
      where("reported_user_id", "==", userId),
    ),
  );

  await deleteDocsByQuery(
    query(collection(db, "user_blocks"), where("user_id", "==", userId)),
  );
  await deleteDocsByQuery(
    query(collection(db, "user_blocks"), where("blocked_user_id", "==", userId)),
  );

  const sessionSnapshots = await getDocs(
    query(collection(db, "ai_chat_sessions"), where("user_id", "==", userId)),
  );

  for (const sessionSnapshot of sessionSnapshots.docs) {
    await deleteDocsByQuery(
      query(collection(db, "ai_chat_sessions", sessionSnapshot.id, "messages")),
    );
  }

  await deleteDocRefs(sessionSnapshots.docs.map((d) => d.ref));

  try {
    await deleteDoc(doc(db, "profiles", userId));
  } catch {
    // Profile may already be removed.
  }

  try {
    await deleteDoc(doc(db, "push_tokens", userId));
  } catch {
    // Token may not exist.
  }

  try {
    await deleteObject(ref(storage, `profile_pics/${userId}`));
  } catch {
    // Profile photo may not exist.
  }

  try {
    await account.updateStatus();
  } catch {
    // If updateStatus is unavailable, account sessions are still deleted below.
  }

  try {
    await account.deleteSessions();
  } catch {
    // Ignore if no sessions remain.
  }

  try {
    await account.deleteSession("current");
  } catch {
    // Ignore if current session has already been invalidated.
  }
}
