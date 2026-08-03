import { describe, expect, it } from "vitest";
import {
  INBOUND_ATTACHMENT_MINIMUM_BUDGET_MS,
  shouldYieldInboundEmailProcessing,
} from "@/lib/email/inbound-budget";

describe("inbound worker time budget", () => {
  const now = Date.parse("2026-08-03T05:00:00.000Z");

  it("continues when one attachment has a safe budget", () => {
    expect(shouldYieldInboundEmailProcessing(now + INBOUND_ATTACHMENT_MINIMUM_BUDGET_MS, now)).toBe(false);
  });

  it("yields before starting work that may exceed the function lifetime", () => {
    expect(shouldYieldInboundEmailProcessing(now + INBOUND_ATTACHMENT_MINIMUM_BUDGET_MS - 1, now)).toBe(true);
  });

  it("does not impose a deadline on direct library callers", () => {
    expect(shouldYieldInboundEmailProcessing(undefined, now)).toBe(false);
  });
});
