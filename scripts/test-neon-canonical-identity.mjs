#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const adminConnection = process.env.DATABASE_URL_UNPOOLED;
if (!adminConnection) {
    throw new Error(
        "DATABASE_URL_UNPOOLED is required; run through `vercel env run` or provide a disposable Neon branch URL.",
    );
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const databaseName = `tm_identity_test_${Date.now()}_${randomBytes(4).toString("hex")}`;
assert.match(databaseName, /^[a-z0-9_]+$/);

const quotedDatabaseName = `"${databaseName}"`;
const adminSql = neon(adminConnection);
const testUrl = new URL(adminConnection);
testUrl.pathname = `/${databaseName}`;

let created = false;
let testFailure;

function runIntegrationTest() {
    const vitestBin = path.join(
        projectRoot,
        "node_modules",
        "vitest",
        "vitest.mjs",
    );

    return new Promise((resolve, reject) => {
        const child = spawn(
            process.execPath,
            [
                vitestBin,
                "run",
                "tests/canonical-identity-neon.integration.test.ts",
            ],
            {
                cwd: projectRoot,
                env: {
                    ...process.env,
                    DATABASE_URL: testUrl.toString(),
                    DATABASE_URL_UNPOOLED: testUrl.toString(),
                    RUN_NEON_CANONICAL_IDENTITY_TEST: "1",
                },
                stdio: "inherit",
            },
        );

        child.once("error", reject);
        child.once("exit", (code, signal) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(
                new Error(
                    signal
                        ? `Vitest terminated by ${signal}`
                        : `Vitest exited with status ${code ?? "unknown"}`,
                ),
            );
        });
    });
}

try {
    await adminSql.query(`CREATE DATABASE ${quotedDatabaseName}`);
    created = true;

    const testClient = neon(testUrl.toString());
    const testDb = drizzle(testClient);
    await migrate(testDb, { migrationsFolder: "./drizzle" });

    await runIntegrationTest();
    console.log(
        `Canonical identity transaction verified in disposable database ${databaseName}.`,
    );
} catch (error) {
    testFailure = error;
} finally {
    if (created) {
        try {
            await adminSql.query(
                `DROP DATABASE ${quotedDatabaseName} WITH (FORCE)`,
            );
            console.log(`Removed disposable database ${databaseName}.`);
        } catch (cleanupError) {
            console.error(
                `Cleanup failed for ${databaseName}: ${cleanupError.message}`,
            );
            if (!testFailure) testFailure = cleanupError;
        }
    }
}

if (testFailure) {
    console.error(
        `Canonical identity Neon verification failed: ${testFailure.message}`,
    );
    process.exit(1);
}
