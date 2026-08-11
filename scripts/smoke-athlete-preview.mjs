#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

const deployment = process.argv[2];
if (!deployment?.startsWith("https://"))
  throw new Error("Pass the HTTPS Preview deployment URL");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "node_modules", ".bin", "vercel");
const nonce = randomBytes(8).toString("hex");
const email = `preview-route-smoke-${nonce}@example.invalid`;
const password = `preview-${nonce}-password`;
let userId;

function call(route, { method = "GET", body, token, cookie } = {}) {
  const curlArgs = ["--silent", "--show-error", "--request", method];
  if (body)
    curlArgs.push(
      "--header",
      "Content-Type: application/json",
      "--data",
      JSON.stringify(body),
    );
  if (token) curlArgs.push("--header", `Authorization: Bearer ${token}`);
  if (cookie) curlArgs.push("--header", `Cookie: ${cookie}`);
  curlArgs.push("--write-out", "\n%{http_code}");
  const output = execFileSync(
    cli,
    ["curl", route, "--deployment", deployment, "--", ...curlArgs],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    },
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

function createAdminCookie() {
  if (!process.env.ADMIN_PASSWORD)
    throw new Error("Preview ADMIN_PASSWORD is required for the admin smoke");
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
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    },
  );
  assert.equal(Number(output.slice(output.lastIndexOf("\n") + 1)), 200);
  const match = output.match(/^set-cookie:\s*([^;\r\n]+)/im);
  assert.ok(match?.[1], "Admin login did not issue a session cookie");
  return match[1];
}

const databaseUrl = [
  process.env.DATABASE_URL_UNPOOLED,
  process.env.POSTGRES_URL_NON_POOLING,
  process.env.DATABASE_URL,
  process.env.POSTGRES_URL,
].find((value) => Boolean(value));
if (!databaseUrl)
  throw new Error("Preview Neon URL is required for guaranteed smoke cleanup");
const sql = neon(databaseUrl);

try {
  assert.deepEqual(call("/api/health"), {
    status: 200,
    json: { status: "ok" },
  });
  assert.equal(call("/api/auth/me").status, 401);
  const forums = call("/api/community/forums");
  assert.equal(forums.status, 200);
  assert.equal(forums.json.length, 9);

  const registered = call("/api/auth/register", {
    method: "POST",
    body: {
      email,
      password,
      display_name: "Preview Route Smoke",
      status: "transitioning",
    },
  });
  assert.equal(registered.status, 200);
  userId = registered.json.user.id;
  const token = registered.json.access_token;
  assert.equal(call("/api/auth/me", { token }).status, 200);
  assert.equal(
    call("/api/profile/intake", {
      method: "POST",
      token,
      body: {
        sport: "Soccer",
        role: "Captain / leader",
        years: "5–9 years",
        relied_on: "Helping teammates prepare for the biggest games each week",
        favorite: "The team",
        community: "solo",
      },
    }).status,
    200,
  );
  assert.equal(
    call("/api/check-ins", {
      method: "POST",
      token,
      body: {
        prompt_id: "preview-smoke",
        prompt_question: "Does the route work?",
        option: "Yes",
      },
    }).status,
    200,
  );
  const plan = call("/api/game-plan", { token });
  assert.equal(plan.status, 200);
  assert.equal(plan.json.intake_done, true);
  assert.equal(plan.json.check_in_count, 1);
  assert.equal(call("/api/auth/logout", { method: "POST", token }).status, 200);
  assert.equal(call("/api/auth/me", { token }).status, 401);
  const adminCookie = createAdminCookie();
  for (const route of [
    "/admin",
    "/admin/users",
    "/admin/checkins",
    "/admin/gameplans",
    "/admin/support",
    "/admin/community",
  ]) {
    assert.equal(
      call(route, { cookie: adminCookie }).status,
      200,
      `${route} failed`,
    );
  }
  console.log(
    "Protected Preview smoke passed: athlete routes, auth/revocation, Neon, and all six Postgres-backed admin views.",
  );
} finally {
  const rows = await sql.query(
    "delete from users where id = $1 or id in (select user_id from user_emails where normalized_email = $2) returning id",
    [userId ?? "00000000-0000-0000-0000-000000000000", email.toLowerCase()],
  );
  console.log(`Removed ${rows.length} synthetic Preview smoke user.`);
}
