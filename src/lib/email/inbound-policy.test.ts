import { describe, expect, it } from "vitest";
import {
  isTrustedInboundSender,
  matchesIntakeAddress,
  normalizeEmailAddress,
  normalizeTrustedSenders,
} from "./inbound-policy";

describe("inbound email policy", () => {
  it("normalizes named and mixed-case addresses", () => {
    expect(normalizeEmailAddress("Accounts Payable <BILLING@Example.com>"))
      .toBe("billing@example.com");
  });

  it("trusts explicit forwarding addresses and organization members", () => {
    const trusted = normalizeTrustedSenders(["billing@example.com"], ["OWNER@example.com"]);
    expect(isTrustedInboundSender("Billing <billing@example.com>", trusted)).toBe(true);
    expect(isTrustedInboundSender("owner@example.com", trusted)).toBe(true);
    expect(isTrustedInboundSender("attacker@example.net", trusted)).toBe(false);
  });

  it("requires the complete workspace address instead of a local-part-only match", () => {
    const intake = { local_part: "northstar-a1b2c3", domain: "inbound.costivra.ai" };
    expect(matchesIntakeAddress(["northstar-a1b2c3@inbound.costivra.ai"], intake)).toBe(true);
    expect(matchesIntakeAddress(["northstar-a1b2c3@wrong.example"], intake)).toBe(false);
  });
});
