import { account } from "@/lib/appwrite";
import { auth } from "@/lib/firebase";
import {
  signInWithCustomToken,
  signOut as signOutFirebase,
} from "firebase/auth";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_FIREBASE_CUSTOM_TOKEN_LENGTH = 8192;

function getBridgeOrigin(): string {
  const configured = process.env.EXPO_PUBLIC_AUTH_BRIDGE_URL?.trim();
  if (!configured) {
    throw new Error("EXPO_PUBLIC_AUTH_BRIDGE_URL is not configured.");
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("EXPO_PUBLIC_AUTH_BRIDGE_URL is invalid.");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "EXPO_PUBLIC_AUTH_BRIDGE_URL must be a credential-free HTTPS origin.",
    );
  }

  return url.origin;
}

async function bridgeRequest(path: string, jwt: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(`${getBridgeOrigin()}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function createAppwriteJwt(): Promise<string> {
  const result = await account.createJWT();
  if (!result.jwt) throw new Error("Appwrite returned an empty JWT.");
  return result.jwt;
}

export async function bootstrapFirebaseSession(
  appwriteUserId: string,
): Promise<void> {
  try {
    await auth.authStateReady();
    const jwt = await createAppwriteJwt();
    const response = await bridgeRequest(
      "/api/mobile/auth/firebase-token",
      jwt,
    );
    if (!response.ok) {
      throw new Error("The mobile authentication bridge rejected the session.");
    }

    const body: unknown = await response.json();
    const firebaseCustomToken =
      body && typeof body === "object" && "firebaseCustomToken" in body
        ? (body as { firebaseCustomToken?: unknown }).firebaseCustomToken
        : undefined;
    if (
      typeof firebaseCustomToken !== "string" ||
      firebaseCustomToken.length === 0 ||
      firebaseCustomToken.length > MAX_FIREBASE_CUSTOM_TOKEN_LENGTH
    ) {
      throw new Error("The mobile authentication bridge returned no token.");
    }

    const credential = await signInWithCustomToken(
      auth,
      firebaseCustomToken,
    );
    if (credential.user.uid !== appwriteUserId) {
      throw new Error("Firebase identity did not match the Appwrite session.");
    }

  } catch {
    // Never let a stale persisted Firebase identity remain usable when Appwrite
    // verification or the bridge fails.
    await signOutFirebase(auth).catch(() => undefined);
    throw new Error("Unable to establish the secure mobile session.");
  }
}

export async function revokeFirebaseSession(): Promise<void> {
  const jwt = await createAppwriteJwt();
  const response = await bridgeRequest("/api/mobile/auth/revoke", jwt);
  if (!response.ok) {
    throw new Error("Unable to revoke the Firebase session.");
  }
}

export async function clearFirebaseSession(): Promise<void> {
  await signOutFirebase(auth);
}
