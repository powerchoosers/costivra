import { describe, expect, it } from "vitest";
import { deduplicateCriticalErrors } from "./critical-errors";

describe("deduplicateCriticalErrors", () => {
  it("collapses repeated safe signals and retains the latest occurrence", () => {
    const result = deduplicateCriticalErrors([
      { source: "report_delivery", status: "failed", errorCode: "REPORT_EMAIL_SEND_FAILED", occurredAt: "2026-08-15T10:00:00Z", recoveryHref: "/manage/activity" },
      { source: "report_delivery", status: "failed", errorCode: "REPORT_EMAIL_SEND_FAILED", occurredAt: "2026-08-15T11:00:00Z", recoveryHref: "/manage/activity" },
      { source: "provider_email", status: "bounced", errorCode: "EMAIL_BOUNCED", occurredAt: "2026-08-15T12:00:00Z", recoveryHref: "/manage/mail" },
    ]);

    expect(result).toEqual([
      expect.objectContaining({ source: "provider_email", occurrences: 1, state: "open", occurredAt: "2026-08-15T12:00:00Z" }),
      expect.objectContaining({ source: "report_delivery", occurrences: 2, state: "open", occurredAt: "2026-08-15T11:00:00Z" }),
    ]);
  });

  it("returns no open signals when current ledgers return no failures", () => {
    expect(deduplicateCriticalErrors([])).toEqual([]);
  });
});
