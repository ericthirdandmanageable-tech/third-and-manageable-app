#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const adminConnection = [process.env.DATABASE_URL_UNPOOLED, process.env.POSTGRES_URL_NON_POOLING]
    .find((value) => Boolean(value));
if (!adminConnection) throw new Error("A direct Neon URL is required; pull the linked Vercel development environment.");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseName = `tm_athlete_api_${Date.now()}_${randomBytes(4).toString("hex")}`;
assert.match(databaseName, /^[a-z0-9_]+$/);
const quotedName = `"${databaseName}"`;
const adminSql = neon(adminConnection);
const testUrl = new URL(adminConnection);
testUrl.pathname = `/${databaseName}`;
let created = false;
let failure;

function runTests() {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [
            path.join(root, "node_modules", "vitest", "vitest.mjs"),
            "run",
            "tests/athlete-api-neon.integration.test.ts",
        ], {
            cwd: root,
            env: {
                ...process.env,
                DATABASE_URL: testUrl.toString(),
                DATABASE_URL_UNPOOLED: testUrl.toString(),
                RUN_NEON_ATHLETE_API_TEST: "1",
                AI_GATEWAY_API_KEY: "",
                VERCEL_OIDC_TOKEN: "",
            },
            stdio: "inherit",
        });
        child.once("error", reject);
        child.once("exit", (code, signal) => code === 0
            ? resolve()
            : reject(new Error(signal ? `Vitest terminated by ${signal}` : `Vitest exited ${code}`)));
    });
}

try {
    await adminSql.query(`CREATE DATABASE ${quotedName}`);
    created = true;
    await migrate(drizzle(neon(testUrl.toString())), { migrationsFolder: "./drizzle" });
    await runTests();
    console.log(`Athlete Route Handlers verified in disposable database ${databaseName}.`);
} catch (error) {
    failure = error;
} finally {
    if (created) {
        try {
            await adminSql.query(`DROP DATABASE ${quotedName} WITH (FORCE)`);
            console.log(`Removed disposable database ${databaseName}.`);
        } catch (cleanupError) {
            console.error(`Cleanup failed for ${databaseName}: ${cleanupError.message}`);
            if (!failure) failure = cleanupError;
        }
    }
}

if (failure) {
    console.error(`Athlete API Neon verification failed: ${failure.message}`);
    process.exit(1);
}
