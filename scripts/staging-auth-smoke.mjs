import { randomBytes } from "node:crypto";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";

import { deleteUser, getAuth, signInWithCustomToken, signOut } from "firebase/auth";
import { initializeApp } from "firebase/app";

const EXPECTED_APPWRITE_PROJECT = "69906dfc003364b9847e";
const EXPECTED_FIREBASE_PROJECT = "third-and-manageable-staging";
const EXPECTED_BRIDGE_ORIGIN =
  "https://third-and-manageable-mobile-staging.vercel.app";

function parseEnvironment(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

const env = parseEnvironment(await readFile(new URL("../.env.local", import.meta.url), "utf8"));

if (
  env.EXPO_PUBLIC_APPWRITE_PROJECT_ID !== EXPECTED_APPWRITE_PROJECT ||
  env.EXPO_PUBLIC_FIREBASE_PROJECT_ID !== EXPECTED_FIREBASE_PROJECT ||
  env.EXPO_PUBLIC_AUTH_BRIDGE_URL !== EXPECTED_BRIDGE_ORIGIN ||
  env.EXPO_PUBLIC_PRODUCT_API_URL !== `${EXPECTED_BRIDGE_ORIGIN}/api/mobile/data`
) {
  throw new Error("Refusing to run outside the isolated staging projects.");
}

const appwriteEndpoint = new URL(env.EXPO_PUBLIC_APPWRITE_ENDPOINT).origin + "/v1";
const cookieJar = new Map();

function cookieHeader() {
  return [...cookieJar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function appwriteRequest(path, method, body) {
  const response = await fetch(`${appwriteEndpoint}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Platform": env.EXPO_PUBLIC_APPWRITE_PLATFORM,
      "X-Appwrite-Project": env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
      ...(cookieJar.size ? { Cookie: cookieHeader() } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  for (const setCookie of response.headers.getSetCookie()) {
    const [pair] = setCookie.split(";", 1);
    const separator = pair.indexOf("=");
    cookieJar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }

  if (!response.ok) {
    throw new Error(`Appwrite request failed with HTTP ${response.status}.`);
  }
  if (response.status === 204) return undefined;
  return response.json();
}

const suffix = `${Date.now()}-${randomBytes(4).toString("hex")}`;
const email = `relay-smoke-${suffix}@example.test`;
const password = `Staging-${randomBytes(18).toString("base64url")}!`;
const userId = `relay_${randomBytes(12).toString("hex")}`;

let firebaseAuth;
let firebaseUser;
let appwriteSessionCreated = false;
let jwt;

async function productRequest(path, method = "GET", body) {
  const response = await fetch(`${env.EXPO_PUBLIC_PRODUCT_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Product API ${method} ${path} failed with HTTP ${response.status}: ${detail.slice(0, 300)}`,
    );
  }
  return response.json();
}

async function uploadProfilePicture() {
  const form = new FormData();
  form.set(
    "image",
    new File(
      [Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64")],
      "smoke.png",
      { type: "image/png" },
    ),
  );
  const response = await fetch(
    `${env.EXPO_PUBLIC_PRODUCT_API_URL}/artifacts/profile-picture`,
    { method: "POST", headers: { Authorization: `Bearer ${jwt}` }, body: form },
  );
  if (!response.ok) {
    throw new Error(`Profile-picture upload failed with HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const payload = await response.json();
  if (!payload.profile_pic?.includes("/storage/buckets/profile-pictures/files/")) {
    throw new Error("Profile-picture upload returned an invalid URL.");
  }
}

try {
  await appwriteRequest("/account", "POST", {
    userId,
    email,
    password,
    name: "Staging Relay Smoke",
  });
  await appwriteRequest("/account/sessions/email", "POST", { email, password });
  appwriteSessionCreated = true;
  ({ jwt } = await appwriteRequest("/account/jwts", "POST", {}));

  const profile = await productRequest("/profile");
  if (profile.id !== userId) throw new Error("Product profile identity did not match Appwrite.");
  const updatedProfile = await productRequest("/profile", "PATCH", {
    display_name: "Staging Relay Smoke Updated",
  });
  if (updatedProfile.display_name !== "Staging Relay Smoke Updated") {
    throw new Error("Product profile write did not round-trip.");
  }
  await uploadProfilePicture();
  const [gamePlan, notifications, artifacts, messages] = await Promise.all([
    productRequest("/game-plan"),
    productRequest("/notifications"),
    productRequest("/artifacts"),
    productRequest("/community/messages?room_id=global&limit=1"),
  ]);
  if (
    typeof gamePlan.completion_count !== "number" ||
    !Array.isArray(notifications) ||
    !Array.isArray(artifacts) ||
    !Array.isArray(messages)
  ) {
    throw new Error("One or more product API domains returned an invalid shape.");
  }

  const bridgeResponse = await fetch(
    `${env.EXPO_PUBLIC_AUTH_BRIDGE_URL}/api/mobile/auth/firebase-token`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (!bridgeResponse.ok) {
    throw new Error(`Bridge exchange failed with HTTP ${bridgeResponse.status}.`);
  }
  const { firebaseCustomToken } = await bridgeResponse.json();

  const firebaseApp = initializeApp({
    apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
  });
  firebaseAuth = getAuth(firebaseApp);
  const credential = await signInWithCustomToken(firebaseAuth, firebaseCustomToken);
  firebaseUser = credential.user;
  if (firebaseUser.uid !== userId) {
    throw new Error("Firebase and Appwrite staging identities did not match.");
  }

  const revokeResponse = await fetch(
    `${env.EXPO_PUBLIC_AUTH_BRIDGE_URL}/api/mobile/auth/revoke`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (!revokeResponse.ok) {
    throw new Error(`Bridge revocation failed with HTTP ${revokeResponse.status}.`);
  }

  const deletion = await productRequest("/account", "DELETE");
  if (deletion.status !== "deleted") throw new Error("Smoke account cleanup failed.");
  appwriteSessionCreated = false;

  console.log(
    JSON.stringify({
      event: "staging_mobile_stack_smoke",
      outcome: "passed",
      domains: ["identity", "firebase_compatibility", "game_plan", "notifications", "profile_picture", "artifacts", "community"],
    }),
  );
} finally {
  if (jwt && appwriteSessionCreated) {
    await productRequest("/account", "DELETE").catch(() => undefined);
  }
  if (firebaseUser) {
    await deleteUser(firebaseUser).catch(() => undefined);
  }
  if (firebaseAuth) {
    await signOut(firebaseAuth).catch(() => undefined);
  }
  if (appwriteSessionCreated) {
    await appwriteRequest("/account/status", "PATCH", {}).catch(() => undefined);
  }
}
