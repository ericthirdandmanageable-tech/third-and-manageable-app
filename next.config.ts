import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in a parent directory otherwise wins
  // the inference and Turbopack resolves from outside the repo.
  turbopack: { root: path.resolve(__dirname) },

  // Allow dev requests coming in via 127.0.0.1 (as opposed to localhost).
  allowedDevOrigins: ["127.0.0.1"],

  async headers() {
    const nativeHandoffHeaders = [
      { key: "Cache-Control", value: "no-store, max-age=0" },
      { key: "Referrer-Policy", value: "no-referrer" },
      {
        key: "Content-Security-Policy",
        value:
          "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
      },
    ];

    return [
      { source: "/oauth.html", headers: nativeHandoffHeaders },
      { source: "/recovery.html", headers: nativeHandoffHeaders },
    ];
  },
};

export default nextConfig;
