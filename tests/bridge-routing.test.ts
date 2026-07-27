import { describe, expect, it } from "vitest";

import {
    athleteApiBase,
    BRIDGE_PREFIX,
    bridgeRewrite,
} from "../src/lib/bridge";

describe("same-origin FastAPI bridge routing", () => {
    it("keeps the browser-facing path relative to the app origin", () => {
        expect(BRIDGE_PREFIX).toBe("/bridge");
        expect(BRIDGE_PREFIX).not.toMatch(/^https?:/);
        expect(athleteApiBase(undefined)).toBe("/bridge");
        expect(athleteApiBase("")).toBe("/bridge");
        expect(athleteApiBase(" https://api.example/ ")).toBe(
            "https://api.example",
        );
    });

    it("proxies that exact prefix to local uvicorn in development", () => {
        expect(bridgeRewrite("development", undefined)).toEqual({
            source: "/bridge/:path*",
            destination: "http://127.0.0.1:8001/:path*",
        });
    });

    it("requires an explicit service origin outside development", () => {
        expect(bridgeRewrite("production", undefined)).toBeNull();
        expect(bridgeRewrite("production", "")).toBeNull();
        expect(bridgeRewrite("development", "")).toEqual({
            source: "/bridge/:path*",
            destination: "http://127.0.0.1:8001/:path*",
        });
        expect(
            bridgeRewrite("production", "https://fastapi.internal.example/"),
        ).toEqual({
            source: "/bridge/:path*",
            destination: "https://fastapi.internal.example/:path*",
        });
    });
});
