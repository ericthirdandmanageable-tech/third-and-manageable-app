import { randomBytes } from "node:crypto";
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
  env.EXPO_PUBLIC_AUTH_BRIDGE_URL !== EXPECTED_BRIDGE_ORIGIN
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

try {
  await appwriteRequest("/account", "POST", {
    userId,
    email,
    password,
    name: "Staging Relay Smoke",
  });
  await appwriteRequest("/account/sessions/email", "POST", { email, password });
  appwriteSessionCreated = true;
  const { jwt } = await appwriteRequest("/account/jwts", "POST", {});

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

  console.log(JSON.stringify({ event: "staging_mobile_auth_smoke", outcome: "passed" }));
} finally {
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
