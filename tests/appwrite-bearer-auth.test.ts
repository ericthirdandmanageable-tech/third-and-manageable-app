import { describe, expect, it } from "vitest";

import { appwriteJwtFromRequest } from "@/lib/appwrite-auth-token";

describe("Appwrite mobile bearer authentication", () => {
  it("accepts a bounded Appwrite JWT", () => {
    const request = new Request("https://example.test/api/profile", {
      headers: { Authorization: "Bearer header.payload.signature" },
    });
    expect(appwriteJwtFromRequest(request)).toBe("header.payload.signature");
  });

  it("distinguishes an absent header from a malformed credential", () => {
    expect(
      appwriteJwtFromRequest(new Request("https://example.test/api/profile")),
    ).toBeUndefined();
    expect(
      appwriteJwtFromRequest(
        new Request("https://example.test/api/profile", {
          headers: { Authorization: "Basic unsafe" },
        }),
      ),
    ).toBeNull();
    expect(
      appwriteJwtFromRequest(
        new Request("https://example.test/api/profile", {
          headers: { Authorization: `Bearer ${"a".repeat(8193)}` },
        }),
      ),
    ).toBeNull();
  });
});
