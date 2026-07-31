import { describe, expect, it } from "vitest";
import { isExplicitRecoveryConfirmation, isValidRecoveryTokenHash } from "./recovery";

describe("password recovery confirmation", () => {
  it("requires the deliberate second-page confirmation signal", () => {
    expect(isExplicitRecoveryConfirmation(new URLSearchParams("token_hash=abc&type=recovery"))).toBe(false);
    expect(isExplicitRecoveryConfirmation(new URLSearchParams("token_hash=abc&type=recovery&confirm=1"))).toBe(true);
  });

  it("rejects incomplete, wrong-type, and oversized token requests", () => {
    expect(isExplicitRecoveryConfirmation(new URLSearchParams("type=recovery&confirm=1"))).toBe(false);
    expect(isExplicitRecoveryConfirmation(new URLSearchParams("token_hash=abc&type=invite&confirm=1"))).toBe(false);
    expect(isValidRecoveryTokenHash("x".repeat(2049))).toBe(false);
  });
});
