import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { createMobileAuthBridge } from "../lib/mobile-auth-bridge-core";

const APPWRITE_USER_ID = "appwrite-user-123";
const BRIDGE_ORIGIN = "https://auth-bridge.staging.example";

describe("mobile authentication bridge client", () => {
  let calls: { signedIn: string[]; signedOut: number; urls: string[] };

  beforeEach(() => {
    calls = { signedIn: [], signedOut: 0, urls: [] };
  });

  function makeBridge(
    options: {
      configuredUrl?: string;
      response?: Response;
      returnedUid?: string;
    } = {},
  ) {
    const auth = { authStateReady: async () => undefined };
    return createMobileAuthBridge({
      account: { createJWT: async () => ({ jwt: "appwrite-jwt" }) },
      auth,
      getConfiguredUrl: () => options.configuredUrl ?? BRIDGE_ORIGIN,
      fetcher: async (url) => {
        calls.urls.push(String(url));
        return options.response ?? new Response(
          JSON.stringify({ firebaseCustomToken: "firebase-token" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
      signInWithCustomToken: async (_auth, token) => {
        calls.signedIn.push(token);
        return { user: { uid: options.returnedUid ?? APPWRITE_USER_ID } };
      },
      signOutFirebase: async () => {
        calls.signedOut += 1;
      },
    });
  }

  it("exchanges an Appwrite JWT and establishes the matching Firebase identity", async () => {
    await makeBridge().bootstrapFirebaseSession(APPWRITE_USER_ID);
    assert.deepEqual(calls.urls, [`${BRIDGE_ORIGIN}/api/mobile/auth/firebase-token`]);
    assert.deepEqual(calls.signedIn, ["firebase-token"]);
    assert.equal(calls.signedOut, 0);
  });

  for (const configuredUrl of [
    "http://auth-bridge.staging.example",
    "https://user:password@auth-bridge.staging.example",
    "https://auth-bridge.staging.example?x-vercel-protection-bypass=secret",
  ]) {
    it(`rejects unsafe bridge configuration: ${configuredUrl}`, async () => {
      await assert.rejects(
        makeBridge({ configuredUrl }).bootstrapFirebaseSession(APPWRITE_USER_ID),
        /Unable to establish the secure mobile session/,
      );
      assert.equal(calls.urls.length, 0);
      assert.equal(calls.signedOut, 1);
    });
  }

  it("fails closed and clears Firebase when the bridge rejects the session", async () => {
    await assert.rejects(
      makeBridge({ response: new Response(null, { status: 401 }) })
        .bootstrapFirebaseSession(APPWRITE_USER_ID),
      /Unable to establish the secure mobile session/,
    );
    assert.equal(calls.signedIn.length, 0);
    assert.equal(calls.signedOut, 1);
  });

  it("clears Firebase when the returned identity does not match Appwrite", async () => {
    await assert.rejects(
      makeBridge({ returnedUid: "different-user" })
        .bootstrapFirebaseSession(APPWRITE_USER_ID),
      /Unable to establish the secure mobile session/,
    );
    assert.equal(calls.signedOut, 1);
  });

  it("revokes with a fresh Appwrite JWT before local sign-out", async () => {
    const bridge = makeBridge({ response: new Response(null, { status: 204 }) });
    await bridge.revokeFirebaseSession();
    await bridge.clearFirebaseSession();
    assert.deepEqual(calls.urls, [`${BRIDGE_ORIGIN}/api/mobile/auth/revoke`]);
    assert.equal(calls.signedOut, 1);
  });
});
