import { describe, expect, it } from "vitest";
import { decideExternalEffectRetry, MAX_AUTOMATIC_EXTERNAL_EFFECT_RETRIES } from "./external-effect-retry";

describe("external effect retry policy", () => {
  it("allows bounded retries only when provider acceptance is known to be absent", () => {
    expect(decideExternalEffectRetry({ status: "failed", failureClass: "safe_retry", retryCount: 1 }))
      .toEqual({ retryable: true, reason: "safe_retry" });
  });

  it.each([
    [{ status: "failed", providerReference: "msg_123", failureClass: "safe_retry" }, "provider_reference_present"],
    [{ status: "failed", failureClass: "provider_ambiguous" }, "provider_outcome_ambiguous"],
    [{ status: "failed", failureClass: "permanent" }, "failure_is_not_retryable"],
    [{ status: "failed", failureClass: "safe_retry", retryCount: MAX_AUTOMATIC_EXTERNAL_EFFECT_RETRIES }, "retry_limit_reached"],
    [{ status: "sent", failureClass: "safe_retry" }, "not_failed"],
  ] as const)("does not automatically retry %o", (input, reason) => {
    expect(decideExternalEffectRetry(input)).toEqual({ retryable: false, reason });
  });
});
