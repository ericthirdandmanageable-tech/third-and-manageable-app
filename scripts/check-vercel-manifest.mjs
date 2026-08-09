#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const result = spawnSync(
    "vercel",
    ["deploy", "--dry", "--format=json", "--yes"],
    {
        cwd: process.cwd(),
        encoding: "utf8",
        env: { ...process.env, NO_COLOR: "1" },
    },
);

if (result.error) {
    console.error(`Could not run the Vercel CLI: ${result.error.message}`);
    process.exit(1);
}

if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.stdout.write(result.stdout);
    process.exit(result.status ?? 1);
}

let manifest;
try {
    manifest = JSON.parse(result.stdout);
} catch {
    console.error("Vercel CLI did not return a JSON deployment manifest.");
    process.stderr.write(result.stderr);
    process.stdout.write(result.stdout);
    process.exit(1);
}

const forbidden = [
    {
        description: "environment or credential file",
        matches: (path) =>
            /(^|\/)\.env(?:\.|$)/.test(path) ||
            /firebase-adminsdk/i.test(path) ||
            /\.(?:pem|p12|pfx|key)$/i.test(path),
    },
    {
        description: "local database",
        matches: (path) => /\.(?:db|sqlite|sqlite3)$/i.test(path),
    },
    {
        description: "dependency, build, or cache residue",
        matches: (path) =>
            /(^|\/)(?:node_modules|\.venv|__pycache__|\.pytest_cache|\.next|dist|build|coverage)(?:\/|$)/.test(
                path,
            ) || /\.tsbuildinfo$/i.test(path),
    },
    {
        description: "test or retired reference application",
        matches: (path) =>
            /^backend\/tests\//.test(path) || /^web-prototype\//.test(path),
    },
    {
        description: "local tooling or non-runtime business artifact",
        matches: (path) =>
            /^(?:\.claude|\.git|\.vercel|business proposal)\//.test(path) ||
            path === "AGENTS.md" ||
            path === "kickbacks-v2.vsix" ||
            path === "render.yaml",
    },
];

const files = Array.isArray(manifest.files)
    ? manifest.files.filter(({ mode }) => (mode & 0o170000) !== 0o040000)
    : [];
const violations = files.flatMap(({ path }) =>
    forbidden
        .filter(({ matches }) => matches(path))
        .map(({ description }) => ({ path, description })),
);

const framework = manifest.framework?.slug;
if (framework !== "services") {
    violations.push({
        path: "<framework>",
        description: `expected services, received ${framework ?? "unknown"}`,
    });
}

if (violations.length > 0) {
    console.error("Unsafe Vercel deployment manifest:");
    for (const { path, description } of violations) {
        console.error(`- ${path}: ${description}`);
    }
    process.exit(1);
}

console.log(
    `Vercel manifest safe: ${manifest.fileCount} files, ${manifest.totalSize} bytes, framework=${framework}.`,
);
