import { describe, expect, it } from "vitest";
import { MAX_REPORT_ATTEMPTS, nextReportRetryAt, reportRetryIsDue } from "./retry";

describe("scheduled report retry policy", () => {
  const now = new Date("2026-08-09T12:00:00.000Z");

  it("backs off failed attempts and stops after the bounded attempt budget", () => {
    expect(nextReportRetryAt(1, now)).toBe("2026-08-09T12:05:00.000Z");
    expect(nextReportRetryAt(2, now)).toBe("2026-08-09T12:30:00.000Z");
    expect(nextReportRetryAt(3, now)).toBe("2026-08-09T14:00:00.000Z");
    expect(nextReportRetryAt(MAX_REPORT_ATTEMPTS, now)).toBeNull();
  });

  it("only reclaims failed runs when their retry window is due", () => {
    expect(reportRetryIsDue({ status: "failed", attempt_count: 1, next_retry_at: "2026-08-09T11:59:00.000Z" }, now)).toBe(true);
    expect(reportRetryIsDue({ status: "failed", attempt_count: 1, next_retry_at: "2026-08-09T12:01:00.000Z" }, now)).toBe(false);
    expect(reportRetryIsDue({ status: "failed", attempt_count: MAX_REPORT_ATTEMPTS }, now)).toBe(false);
    expect(reportRetryIsDue({ status: "accepted", attempt_count: 1 }, now)).toBe(false);
  });
});
