import { describe, expect, it } from "vitest";

import { matchesImageSignature } from "./avatar";

describe("profile image signatures", () => {
  it("accepts the supported image headers", () => {
    expect(matchesImageSignature(Uint8Array.from([0xff, 0xd8, 0xff]), "image/jpeg")).toBe(true);
    expect(matchesImageSignature(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png")).toBe(true);
    expect(matchesImageSignature(new TextEncoder().encode("RIFF1234WEBP"), "image/webp")).toBe(true);
  });

  it("rejects renamed or unsupported files", () => {
    expect(matchesImageSignature(new TextEncoder().encode("not an image"), "image/png")).toBe(false);
    expect(matchesImageSignature(Uint8Array.from([0xff, 0xd8, 0xff]), "image/gif")).toBe(false);
  });
});
