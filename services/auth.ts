/**
 * Auth service: Appwrite for authentication, Firebase Firestore for profile data.
 * The Appwrite user.$id is the universal UID used as the Firestore document ID.
 */
import { account } from "@/lib/appwrite";
import { db, storage } from "@/lib/firebase";
import {
  bootstrapFirebaseSession,
  clearFirebaseSession,
  revokeFirebaseSession,
} from "@/lib/mobile-auth-bridge";
import { Profile } from "@/types";
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

function getPasswordRecoveryUrl(): string {
  const recoveryUrl = (
    process.env.EXPO_PUBLIC_PASSWORD_RECOVERY_URL ??
    process.env.EXPO_PUBLIC_PASSWORD_RECOVERY_BRIDGE_URL
  )?.trim();
  if (!recoveryUrl?.startsWith("https://")) {
    throw new Error(
      "Password recovery is unavailable. Please contact support for help resetting your password.",
    );
  }
  return recoveryUrl;
}

async function upsertIdentityProfile(userId: string, email?: string | null) {
  const payload: { user_id: string; email?: string; verified: false } = {
    user_id: userId,
    verified: false,
  };
  if (email) payload.email = email;

  await setDoc(doc(db, "profiles", userId), payload, { merge: true });
}

async function bootstrapNewSession(userId: string): Promise<void> {
  try {
    await bootstrapFirebaseSession(userId);
  } catch (error) {
    // Avoid leaving a half-established Appwrite session behind. Without its
    // matching Firebase identity, the app must return to a clean signed-out
    // state so the user can retry normally.
    await account.deleteSession("current").catch(() => undefined);
    throw error;
  }
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
  // This fixed return URI is handed off by the registered HTTPS Appwrite
  // callback page. Do not derive a `localhost` authority: Appwrite validates
  // success/failure URLs against its registered Web platforms first.
  return "thirdandmanageableapp://oauth/";
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
  if (callbackUrl === deepLink) {
    throw new Error(
      "OAuth is unavailable until a registered HTTPS callback URL is configured.",
    );
  }
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
  await bootstrapNewSession(user.$id);
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
  await bootstrapNewSession(userId);
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
  await bootstrapNewSession(session.userId);
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

export async function requestPasswordRecovery(email: string): Promise<void> {
  await account.createRecovery(email, getPasswordRecoveryUrl());
}

export async function resetPassword(
  userId: string,
  secret: string,
  password: string,
): Promise<void> {
  if (!userId || !secret) {
    throw new Error(
      "This password reset link is invalid or incomplete. Request a new link and try again.",
    );
  }
  await account.updateRecovery(userId, secret, password);
}

export async function signOut() {
  let revocationFailed = false;
  try {
    await revokeFirebaseSession();
  } catch {
    revocationFailed = true;
  }

  await clearFirebaseSession().catch(() => undefined);
  await account.deleteSession("current");

  if (revocationFailed) {
    throw new Error(
      "Signed out locally, but server-side session revocation needs retry.",
    );
  }
}

export async function getCurrentUser() {
  try {
    const user = await getCurrentUserWithRetry();
    if (!user) {
      await clearFirebaseSession().catch(() => undefined);
      return null;
    }
    await bootstrapFirebaseSession(user.$id);
    return user;
  } catch {
    await clearFirebaseSession().catch(() => undefined);
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
  await revokeFirebaseSession();

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

  await clearFirebaseSession().catch(() => undefined);
}
