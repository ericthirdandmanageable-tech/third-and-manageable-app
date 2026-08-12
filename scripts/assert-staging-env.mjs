import { readFile } from "node:fs/promises";

const expected = {
  EXPO_PUBLIC_APPWRITE_ENDPOINT: "https://fra.cloud.appwrite.io/v1",
  EXPO_PUBLIC_APPWRITE_PROJECT_ID: "69906dfc003364b9847e",
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: "third-and-manageable-staging",
  EXPO_PUBLIC_AUTH_BRIDGE_URL:
    "https://third-and-manageable-mobile-staging.vercel.app",
};

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

let source;
try {
  source = await readFile(
    process.env.STAGING_ENV_FILE ?? new URL("../.env.local", import.meta.url),
    "utf8",
  );
} catch {
  throw new Error(
    "Staging builds require a local .env.local containing the isolated staging configuration.",
  );
}

const env = { ...parseEnvironment(source), ...process.env };
const mismatches = Object.entries(expected).filter(
  ([name, value]) => env[name] !== value,
);

if (mismatches.length) {
  throw new Error(
    `Refusing to build staging with non-staging configuration: ${mismatches
      .map(([name]) => name)
      .join(", ")}.`,
  );
}

if (env.EXPO_PUBLIC_GEMINI_API_KEY?.trim()) {
  throw new Error(
    "Refusing to bundle a Gemini key in staging until it is a staging-only key.",
  );
}

console.log("Staging environment verified: Appwrite, Firebase, and auth bridge are isolated.");
