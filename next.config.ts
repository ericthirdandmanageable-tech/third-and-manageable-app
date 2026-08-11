import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in a parent directory otherwise wins
  // the inference and Turbopack resolves from outside the repo.
  turbopack: { root: path.resolve(__dirname) },

  // Allow dev requests coming in via 127.0.0.1 (as opposed to localhost).
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
