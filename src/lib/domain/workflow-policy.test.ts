import { describe, expect, it } from "vitest";
import { actionMayStart, canTransitionAction, canTransitionOpportunity } from "./workflow-policy";

describe("workflow policy", () => {
  it("blocks skipping opportunity review", () => {
    expect(canTransitionOpportunity("open", "approved")).toBe(false);
    expect(canTransitionOpportunity("under_review", "approved")).toBe(true);
  });

  it("blocks completing an action before it starts", () => {
    expect(canTransitionAction("approved", "complete")).toBe(false);
    expect(canTransitionAction("in_progress", "complete")).toBe(true);
  });

  it("requires an accepted baseline for price actions", () => {
    expect(actionMayStart({ opportunityType: "price_increase", savingsStatus: "baseline_review" })).toBe(false);
    expect(actionMayStart({ opportunityType: "price_increase", savingsStatus: "evidence_pending" })).toBe(true);
    expect(actionMayStart({ opportunityType: "energy_review", savingsStatus: null })).toBe(true);
  });
});
