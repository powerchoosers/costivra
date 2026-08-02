import { describe, expect, it, vi } from "vitest";
import {
  INBOUND_EMAIL_RETRY_DELAYS_SECONDS,
  inboundEmailRetryDecision,
} from "@/lib/email/inbound-retry";

describe("inbound email retry policy", () => {
  it("uses bounded exponential-style delays for retryable failures", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T12:00:00.000Z"));
    expect(inboundEmailRetryDecision(1, 5)).toEqual({
      status: "retrying",
      nextAttemptAt: "2026-08-02T12:01:00.000Z",
    });
    expect(inboundEmailRetryDecision(2, 5)).toEqual({
      status: "retrying",
      nextAttemptAt: "2026-08-02T12:05:00.000Z",
    });
    expect(inboundEmailRetryDecision(4, 5)).toEqual({
      status: "retrying",
      nextAttemptAt: "2026-08-02T14:00:00.000Z",
    });
    vi.useRealTimers();
  });

  it("stops retrying at the configured attempt limit", () => {
    expect(inboundEmailRetryDecision(5, 5)).toEqual({
      status: "dead_letter",
      nextAttemptAt: null,
    });
    expect(INBOUND_EMAIL_RETRY_DELAYS_SECONDS).toHaveLength(4);
  });
});
