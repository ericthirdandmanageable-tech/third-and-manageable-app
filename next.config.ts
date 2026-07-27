import path from "node:path";
import type { NextConfig } from "next";

import { bridgeRewrite } from "./src/lib/bridge";

/*
 * Development-only bridge proxy.
 *
 * The athlete API client calls the FastAPI bridge at the same-origin `/bridge`
 * prefix (`src/lib/athlete/api.ts`). In production a `vercel.json` rewrite maps
 * that prefix to the FastAPI service before Next.js is involved; locally there
 * is no platform in front of us, so Next.js proxies it to the uvicorn process.
 *
 * Proxying server-side rather than pointing the browser at `:8001` directly is
 * what makes CORS a non-issue in both environments — the browser only ever
 * talks to its own origin. `backend/app/config.py` therefore defaults to no
 * CORS origins at all.
 *
 * Both this rewrite and the production one are deleted at Phase 2 step 16, when
 * the Route Handlers under `app/api/` replace the bridge.
 */
const rewrite = bridgeRewrite(process.env.NODE_ENV, process.env.BRIDGE_ORIGIN);

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in a parent directory otherwise wins
  // the inference and Turbopack resolves from outside the repo.
  turbopack: { root: path.resolve(__dirname) },

  // Allow dev requests coming in via 127.0.0.1 (as opposed to localhost).
  allowedDevOrigins: ["127.0.0.1"],

  async rewrites() {
    return rewrite ? [rewrite] : [];
  },
};

export default nextConfig;
