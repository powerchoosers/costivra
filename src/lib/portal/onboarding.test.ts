import { describe, expect, it } from "vitest";
import { deriveOnboardingProjection } from "./onboarding";

const base = { documentCount: 0, locationCount: 0, monitoredCount: 0, needsReviewInvoices: 0, authoritativeReview: false };
const existing = {
  status: "not_started" as const,
  current_step: "account_confirmed" as const,
  company_completed_at: null, location_completed_at: null, documents_completed_at: null,
  review_completed_at: null, monitoring_selected_at: null, monitoring_completed_at: null,
  activated_at: null, blocked_reason: null,
};

describe("deriveOnboardingProjection", () => {
  it("keeps incomplete progress from activating", () => {
    const result = deriveOnboardingProjection({ ...base, documentCount: 4, locationCount: 1, authoritativeReview: false, monitoredCount: 1 }, existing, "2026-08-09T00:00:00.000Z");
    expect(result.status).toBe("in_progress");
    expect(result.current_step).toBe("review");
    expect(result.activated_at).toBeNull();
  });

  it("activates only when every required record-backed criterion is complete", () => {
    const result = deriveOnboardingProjection({ ...base, documentCount: 3, locationCount: 1, authoritativeReview: true, monitoredCount: 1 }, existing, "2026-08-09T00:00:00.000Z");
    expect(result.status).toBe("activated");
    expect(result.current_step).toBe("complete");
    expect(result.activated_at).toBe("2026-08-09T00:00:00.000Z");
  });

  it("preserves an explicit blocked state until an operator changes it", () => {
    const result = deriveOnboardingProjection({ ...base, documentCount: 3, locationCount: 1, authoritativeReview: true, monitoredCount: 1 }, { ...existing, status: "blocked", current_step: "review", blocked_reason: "Needs owner approval" });
    expect(result.status).toBe("blocked");
    expect(result.current_step).toBe("review");
    expect(result.blocked_reason).toBe("Needs owner approval");
  });
});
