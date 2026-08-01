import { describe, expect, it } from "vitest";
import { calculateVerifiedAnnualSavings, evaluateExpenseChange } from "@/lib/domain/value-engine";
import { actionMayStart, canTransitionAction, canTransitionOpportunity } from "@/lib/domain/workflow-policy";

describe("invoice-to-verified-value policy loop", () => {
  it("requires review, action approval, baseline acceptance, and later evidence", () => {
    const baseline = { id: "expense-before", amount: "1000.00", currency: "USD", category: "Telecom", periodStart: "2026-01-01", periodEnd: "2026-01-31" };
    const increased = { id: "expense-source", amount: "1250.00", currency: "USD", category: "Telecom", periodStart: "2026-02-01", periodEnd: "2026-02-28" };
    const later = { id: "expense-after", amount: "980.00", currency: "USD", category: "Telecom", periodStart: "2026-04-01", periodEnd: "2026-04-30" };

    const finding = evaluateExpenseChange(increased, baseline);
    expect(finding?.ruleKey).toBe("telecom_price_increase");
    expect(canTransitionOpportunity("under_review", "approved")).toBe(true);
    expect(canTransitionAction("pending_approval", "approved")).toBe(true);
    expect(actionMayStart({ opportunityType: "price_increase", savingsStatus: "baseline_review" })).toBe(false);
    expect(actionMayStart({ opportunityType: "price_increase", savingsStatus: "evidence_pending" })).toBe(true);

    const verified = calculateVerifiedAnnualSavings(increased, later);
    expect(Number(verified?.amount)).toBeGreaterThan(0);
    expect(verified?.calculationInputs.baselineExpenseId).toBe("expense-source");
    expect(verified?.calculationInputs.comparisonExpenseId).toBe("expense-after");
  });
});
