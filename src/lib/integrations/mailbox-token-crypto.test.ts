import { describe, expect, it, vi } from "vitest";
import { decryptMailboxToken, encryptMailboxToken } from "./mailbox-token-crypto";

describe("mailbox token encryption", () => {
  it("round trips tokens without storing plaintext", () => {
    vi.stubEnv("INTEGRATION_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
    const encrypted = encryptMailboxToken("refresh-token");
    expect(encrypted).not.toContain("refresh-token");
    expect(decryptMailboxToken(encrypted)).toBe("refresh-token");
  });

  it("fails closed when the key is missing", () => {
    vi.stubEnv("INTEGRATION_TOKEN_ENCRYPTION_KEY", "");
    expect(() => encryptMailboxToken("token")).toThrow(/required/);
  });
});
