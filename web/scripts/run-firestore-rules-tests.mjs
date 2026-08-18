import {
  accessSync,
  constants,
  existsSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectId = "demo-third-and-manageable-rules";
if (!projectId.startsWith("demo-")) {
  throw new Error("Firestore Rules tests refuse to run against a non-demo project.");
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const firebaseBin = path.join(
  root,
  "firebase-emulator",
  "node_modules",
  "firebase-tools",
  "lib",
  "bin",
  "firebase.js",
);
const configPath = path.join(root, "firebase-emulator", "firebase.json");
const testPath = path.join(root, "tests", "firestore-rules", "firestore.rules.test.mjs");

try {
  accessSync(firebaseBin, constants.R_OK);
} catch {
  throw new Error(
    "Firebase emulator tooling is missing. Run: npm install --prefix firebase-emulator",
  );
}

function executable(candidate) {
  try {
    accessSync(candidate, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

const javaCandidates = [
  process.env.JAVA_HOME && path.join(process.env.JAVA_HOME, "bin", "java"),
  "/opt/homebrew/opt/openjdk@21/bin/java",
  "/usr/local/opt/openjdk@21/bin/java",
].filter(Boolean);

const java = javaCandidates.find(executable);
const environment = Object.fromEntries(
  ["HOME", "LANG", "LC_ALL", "NO_COLOR", "PATH", "TMPDIR"].flatMap((name) =>
    process.env[name] ? [[name, process.env[name]]] : [],
  ),
);
if (java) {
  environment.PATH = `${path.dirname(java)}${path.delimiter}${environment.PATH ?? ""}`;
}

// The allowlist above deliberately excludes cloud credentials, application
// secrets, Firebase tokens, and DEBUG (Firebase otherwise prints its full env).
environment.CI = "true";
environment.FIREBASE_RULES_TEST_PROJECT_ID = projectId;

const sentinelDirectory = mkdtempSync(path.join(os.tmpdir(), "third-manageable-firestore-rules-"));
const successSentinel = path.join(sentinelDirectory, "passed");
const testCommand = [
  JSON.stringify(process.execPath),
  "--test",
  "--test-concurrency=1",
  JSON.stringify(testPath),
  "&&",
  JSON.stringify(process.execPath),
  "-e",
  JSON.stringify("require('node:fs').writeFileSync(process.argv[1], 'passed')"),
  JSON.stringify(successSentinel),
].join(" ");

const result = spawnSync(
  process.execPath,
  [
    firebaseBin,
    "emulators:exec",
    "--config",
    configPath,
    "--project",
    projectId,
    "--only",
    "firestore",
    "--non-interactive",
    testCommand,
  ],
  {
    // Keep Firebase's debug log and other transient CLI files inside the same
    // disposable directory as the success sentinel.
    cwd: sentinelDirectory,
    env: environment,
    stdio: "inherit",
  },
);

if (result.error) {
  rmSync(sentinelDirectory, { recursive: true, force: true });
  throw result.error;
}

const passed = result.status === 0 && existsSync(successSentinel);
rmSync(sentinelDirectory, { recursive: true, force: true });
process.exitCode = passed ? 0 : 1;
