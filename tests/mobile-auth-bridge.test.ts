import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bootstrapFirebaseSession,
  clearFirebaseSession,
  revokeFirebaseSession,
} from "@/lib/mobile-auth-bridge";

const mocks = vi.hoisted(() => ({
  authStateReady: vi.fn(),
  createJWT: vi.fn(),
  signInWithCustomToken: vi.fn(),
  signOutFirebase: vi.fn(),
}));

vi.mock("@/lib/appwrite", () => ({
  account: { createJWT: mocks.createJWT },
}));

vi.mock("@/lib/firebase", () => ({
  auth: { authStateReady: mocks.authStateReady },
}));

vi.mock("firebase/auth", () => ({
  signInWithCustomToken: mocks.signInWithCustomToken,
  signOut: mocks.signOutFirebase,
}));

const APPWRITE_USER_ID = "appwrite-user-123";
const BRIDGE_ORIGIN = "https://auth-bridge.staging.example";

describe("mobile authentication bridge client", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubEnv("EXPO_PUBLIC_AUTH_BRIDGE_URL", BRIDGE_ORIGIN);
    mocks.authStateReady.mockReset().mockResolvedValue(undefined);
    mocks.createJWT.mockReset().mockResolvedValue({ jwt: "appwrite-jwt" });
    mocks.signInWithCustomToken.mockReset().mockResolvedValue({
      user: { uid: APPWRITE_USER_ID },
    });
    mocks.signOutFirebase.mockReset().mockResolvedValue(undefined);
  });

  it("exchanges an Appwrite JWT and establishes the matching Firebase identity", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ firebaseCustomToken: "firebase-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await bootstrapFirebaseSession(APPWRITE_USER_ID);

    expect(mocks.authStateReady).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      `${BRIDGE_ORIGIN}/api/mobile/auth/firebase-token`,
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer appwrite-jwt",
          "Content-Type": "application/json",
        },
      }),
    );
    expect(mocks.signInWithCustomToken).toHaveBeenCalledWith(
      expect.anything(),
      "firebase-token",
    );
    expect(mocks.signOutFirebase).not.toHaveBeenCalled();
  });

  it.each([
    "http://auth-bridge.staging.example",
    "https://user:password@auth-bridge.staging.example",
    "https://auth-bridge.staging.example?x-vercel-protection-bypass=secret",
  ])("rejects unsafe bridge configuration: %s", async (configuredUrl) => {
    vi.stubEnv("EXPO_PUBLIC_AUTH_BRIDGE_URL", configuredUrl);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      bootstrapFirebaseSession(APPWRITE_USER_ID),
    ).rejects.toThrow("Unable to establish the secure mobile session.");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.signOutFirebase).toHaveBeenCalledOnce();
  });

  it("fails closed and clears Firebase when the bridge rejects the session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );

    await expect(
      bootstrapFirebaseSession(APPWRITE_USER_ID),
    ).rejects.toThrow("Unable to establish the secure mobile session.");

    expect(mocks.signInWithCustomToken).not.toHaveBeenCalled();
    expect(mocks.signOutFirebase).toHaveBeenCalledOnce();
  });

  it("clears Firebase when the returned identity does not match Appwrite", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ firebaseCustomToken: "firebase-token" }),
          { status: 200 },
        ),
      ),
    );
    mocks.signInWithCustomToken.mockResolvedValue({
      user: { uid: "different-user" },
    });

    await expect(
      bootstrapFirebaseSession(APPWRITE_USER_ID),
    ).rejects.toThrow("Unable to establish the secure mobile session.");

    expect(mocks.signOutFirebase).toHaveBeenCalledOnce();
  });

  it("revokes with a fresh Appwrite JWT before local sign-out", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await revokeFirebaseSession();
    await clearFirebaseSession();

    expect(fetchMock).toHaveBeenCalledWith(
      `${BRIDGE_ORIGIN}/api/mobile/auth/revoke`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer appwrite-jwt",
        }),
      }),
    );
    expect(mocks.signOutFirebase).toHaveBeenCalledOnce();
  });
});
