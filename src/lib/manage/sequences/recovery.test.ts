import { describe, expect, it } from "vitest";
import { classifySequenceFailure } from "./recovery";

describe("sequence recovery classification", () => {
  it("requires reconciliation when provider acceptance is ambiguous", () => {
    expect(classifySequenceFailure({ status: "failed", provider_reference: "resend_123" })).toBe("provider_ambiguous");
  });
  it("allows only unaccepted failed effects to be retried", () => {
    expect(classifySequenceFailure({ status: "failed", provider_reference: null })).toBe("safe_retry");
    expect(classifySequenceFailure({ status: "sent", provider_reference: "resend_123" })).toBe("provider_ambiguous");
  });
});
