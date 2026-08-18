import assert from "node:assert/strict";
import test from "node:test";

import {
  MobileApiError,
  createMobileApi,
  getProductApiBase,
} from "../lib/mobile-api-core";

test("product API URL must be a credential-free HTTPS URL", () => {
  assert.equal(
    getProductApiBase("https://relay.example/api/mobile/data/"),
    "https://relay.example/api/mobile/data",
  );
  assert.throws(() => getProductApiBase("http://relay.example"));
  assert.throws(() => getProductApiBase("https://user:secret@relay.example"));
  assert.throws(() => getProductApiBase("https://relay.example?secret=value"));
});

test("creates a fresh Appwrite JWT and sends only the expected request", async () => {
  let jwtCalls = 0;
  let captured: { input: string; init?: RequestInit } | undefined;
  const api = createMobileApi({
    account: {
      async createJWT() {
        jwtCalls += 1;
        return { jwt: `jwt-${jwtCalls}` };
      },
    },
    getConfiguredUrl: () => "https://relay.example/api/mobile/data",
    fetcher: async (input, init) => {
      captured = { input: String(input), init };
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  });

  await api("/profile", {
    method: "PATCH",
    body: { display_name: "Athlete" },
  });

  assert.equal(jwtCalls, 1);
  assert.equal(captured?.input, "https://relay.example/api/mobile/data/profile");
  assert.deepEqual(captured?.init?.headers, {
    Authorization: "Bearer jwt-1",
    "Content-Type": "application/json",
  });
  assert.equal(captured?.init?.body, JSON.stringify({ display_name: "Athlete" }));
});

test("maps safe API errors without exposing upstream internals", async () => {
  const api = createMobileApi({
    account: { createJWT: async () => ({ jwt: "jwt" }) },
    getConfiguredUrl: () => "https://relay.example/api/mobile/data",
    fetcher: async () =>
      new Response(JSON.stringify({ detail: "No check-in today" }), {
        status: 404,
      }),
  });

  await assert.rejects(
    api("/check-ins/today"),
    (error: unknown) =>
      error instanceof MobileApiError &&
      error.status === 404 &&
      error.message === "No check-in today",
  );
});
