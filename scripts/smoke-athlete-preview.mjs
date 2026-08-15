#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const deployment = process.argv[2];
if (!deployment?.startsWith("https://")) {
  throw new Error("Pass the HTTPS Preview deployment URL");
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "node_modules", ".bin", "vercel");
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "tm-preview-smoke-"));
const cookieJar = path.join(temporaryDirectory, "athlete-cookies.txt");
const profileImage = path.join(temporaryDirectory, "profile.png");
writeFileSync(cookieJar, "", { mode: 0o600 });
writeFileSync(
  profileImage,
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  ),
  { mode: 0o600 },
);
const nonce = randomBytes(8).toString("hex");
const email = `preview-route-smoke-${nonce}@example.invalid`;
const password = `preview-${nonce}-password`;
let registered = false;
let uploadedProfileImageUrl;

function call(route, { method = "GET", body, cookie } = {}) {
  const curlArgs = [
    "--silent",
    "--show-error",
    "--request",
    method,
    "--cookie",
    cookieJar,
    "--cookie-jar",
    cookieJar,
  ];
  if (body) {
    curlArgs.push(
      "--header",
      "Content-Type: application/json",
      "--data",
      JSON.stringify(body),
    );
  }
  if (cookie) curlArgs.push("--header", `Cookie: ${cookie}`);
  curlArgs.push("--write-out", "\n%{http_code}");
  const output = execFileSync(
    cli,
    ["curl", route, "--deployment", deployment, "--", ...curlArgs],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
  const split = output.lastIndexOf("\n");
  const responseBody = output.slice(0, split);
  const status = Number(output.slice(split + 1));
  let json;
  try {
    json = JSON.parse(responseBody);
  } catch {
    json = responseBody;
  }
  return { status, json };
}

function uploadProfileImage() {
  const output = execFileSync(
    cli,
    [
      "curl",
      "/api/artifacts/profile-picture",
      "--deployment",
      deployment,
      "--",
      "--silent",
      "--show-error",
      "--request",
      "POST",
      "--cookie",
      cookieJar,
      "--cookie-jar",
      cookieJar,
      "--form",
      `image=@${profileImage};type=image/png`,
      "--write-out",
      "\n%{http_code}",
    ],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
  const split = output.lastIndexOf("\n");
  return {
    status: Number(output.slice(split + 1)),
    json: JSON.parse(output.slice(0, split)),
  };
}

function createAdminCookie() {
  if (!process.env.ADMIN_PASSWORD) {
    throw new Error("Preview ADMIN_PASSWORD is required for the admin smoke");
  }
  const output = execFileSync(
    cli,
    [
      "curl",
      "/api/login",
      "--deployment",
      deployment,
      "--",
      "--silent",
      "--show-error",
      "--request",
      "POST",
      "--dump-header",
      "-",
      "--header",
      "Content-Type: application/json",
      "--data",
      JSON.stringify({ password: process.env.ADMIN_PASSWORD }),
      "--write-out",
      "\n%{http_code}",
    ],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
  assert.equal(Number(output.slice(output.lastIndexOf("\n") + 1)), 200);
  const match = output.match(/^set-cookie:\s*([^;\r\n]+)/im);
  assert.ok(match?.[1], "Admin login did not issue a session cookie");
  return match[1];
}

try {
  assert.deepEqual(call("/api/health"), {
    status: 200,
    json: {
      status: "ok",
      backend: "appwrite-firestore",
      integration_environment: "staging",
    },
  });
  assert.equal(call("/api/auth/me").status, 401);
  const forums = call("/api/community/forums");
  assert.equal(forums.status, 200);
  assert.equal(forums.json.length, 9);

  const registration = call("/api/auth/register", {
    method: "POST",
    body: {
      email,
      password,
      display_name: "Preview Route Smoke",
      status: "transitioning",
    },
  });
  assert.equal(registration.status, 200);
  registered = true;
  assert.equal(call("/api/auth/me").status, 200);
  assert.equal(call("/api/profile/intake", {
    method: "POST",
    body: {
      sport: "Soccer",
      role: "Captain / leader",
      years: "5–9 years",
      relied_on: "Helping teammates prepare for the biggest games each week",
      favorite: "The team",
      community: "solo",
    },
  }).status, 200);
  assert.equal(call("/api/check-ins", {
    method: "POST",
    body: {
      prompt_id: "preview-smoke",
      prompt_question: "Does the route work?",
      option: "Yes",
    },
  }).status, 200);
  const plan = call("/api/game-plan");
  assert.equal(plan.status, 200);
  assert.equal(plan.json.intake_done, true);
  assert.equal(plan.json.check_in_count, 1);
  const uploadedProfileImage = uploadProfileImage();
  assert.equal(uploadedProfileImage.status, 200);
  assert.match(
    uploadedProfileImage.json.profile_pic,
    /\/storage\/buckets\/profile-pictures\/files\//,
  );
  uploadedProfileImageUrl = uploadedProfileImage.json.profile_pic;
  assert.equal((await fetch(uploadedProfileImage.json.profile_pic)).status, 200);

  if (process.env.SKIP_ADMIN_SMOKE !== "1") {
    const adminCookie = createAdminCookie();
    for (const route of [
      "/admin",
      "/admin/users",
      "/admin/checkins",
      "/admin/gameplans",
      "/admin/support",
      "/admin/community",
    ]) {
      assert.equal(call(route, { cookie: adminCookie }).status, 200, `${route} failed`);
    }
  }
  console.log(
    process.env.SKIP_ADMIN_SMOKE === "1"
      ? "Protected Preview athlete smoke passed: Appwrite session auth, Firestore product data, and Appwrite Storage profile images."
      : "Protected Preview smoke passed: Appwrite session auth, Firestore product data, Appwrite Storage profile images, and all six admin views.",
  );
} finally {
  if (registered) {
    const cleanup = call("/api/account", { method: "DELETE" });
    if (cleanup.status === 200 && uploadedProfileImageUrl) {
      assert.equal((await fetch(uploadedProfileImageUrl)).status, 404);
    }
    console.log(
      cleanup.status === 200
        ? "Removed the synthetic Appwrite/Firebase Preview user."
        : `Synthetic Preview cleanup failed with ${cleanup.status}.`,
    );
  }
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
