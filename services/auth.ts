/**
 * Auth service: Appwrite owns identity; the authenticated web API owns product data.
 * The Appwrite user.$id is the universal UID used by the server as the Firestore owner.
 */
import { account } from "@/lib/appwrite";
import { mobileApi } from "@/lib/mobile-api";
import {
  bootstrapFirebaseSession,
  clearFirebaseSession,
  revokeFirebaseSession,
} from "@/lib/mobile-auth-bridge";
import { Profile } from "@/types";
import * as WebBrowser from "expo-web-browser";
import { ID, OAuthProvider } from "react-native-appwrite";

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
  await mobileApi<Profile>("/profile");
  return user;
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
  await mobileApi<Profile>("/profile");

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
  await mobileApi<Profile>("/profile");

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
  void userId;
  try {
    return await mobileApi<Profile>("/profile");
  } catch {
    return null;
  }
}

export async function upsertProfile(
  profile: Partial<Profile> & { id: string },
) {
  const { id, ...data } = profile;
  void id;
  return mobileApi<Profile>("/profile", { method: "PATCH", body: data });
}

export async function deleteAccount(): Promise<void> {
  await mobileApi<{ status: "deleted" }>("/account", { method: "DELETE" });
  await clearFirebaseSession().catch(() => undefined);
}
