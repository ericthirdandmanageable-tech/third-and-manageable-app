const REQUEST_TIMEOUT_MS = 15_000;
const MAX_FIREBASE_CUSTOM_TOKEN_LENGTH = 8192;

export interface MobileAuthBridgeDependencies<TAuth> {
  account: { createJWT: () => Promise<{ jwt?: string }> };
  auth: TAuth & { authStateReady: () => Promise<void> };
  signInWithCustomToken: (
    auth: TAuth,
    token: string,
  ) => Promise<{ user: { uid: string } }>;
  signOutFirebase: (auth: TAuth) => Promise<unknown>;
  getConfiguredUrl?: () => string | undefined;
  fetcher?: typeof fetch;
}

export function getBridgeOrigin(configuredValue?: string): string {
  const configured = configuredValue?.trim();
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

export function createMobileAuthBridge<TAuth>(
  dependencies: MobileAuthBridgeDependencies<TAuth>,
) {
  const {
    account,
    auth,
    signInWithCustomToken,
    signOutFirebase,
    getConfiguredUrl = () => process.env.EXPO_PUBLIC_AUTH_BRIDGE_URL,
    fetcher = fetch,
  } = dependencies;

  async function bridgeRequest(path: string, jwt: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      return await fetcher(`${getBridgeOrigin(getConfiguredUrl())}${path}`, {
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

  async function bootstrapFirebaseSession(
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

      const credential = await signInWithCustomToken(auth, firebaseCustomToken);
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

  async function revokeFirebaseSession(): Promise<void> {
    const jwt = await createAppwriteJwt();
    const response = await bridgeRequest("/api/mobile/auth/revoke", jwt);
    if (!response.ok) {
      throw new Error("Unable to revoke the Firebase session.");
    }
  }

  async function clearFirebaseSession(): Promise<void> {
    await signOutFirebase(auth);
  }

  return {
    bootstrapFirebaseSession,
    clearFirebaseSession,
    revokeFirebaseSession,
  };
}
