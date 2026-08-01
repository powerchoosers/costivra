import { describe, expect, it } from "vitest";
import { calculateVerifiedAnnualSavings, evaluateExpenseChange, inclusivePeriodDays } from "./value-engine";

const prior = { id: "prior", amount: "100.00", currency: "USD", category: "Software", periodStart: "2026-01-01", periodEnd: "2026-01-31" };
const current = { id: "current", amount: "120.00", currency: "USD", category: "Software", periodStart: "2026-02-01", periodEnd: "2026-02-28" };

describe("value engine", () => {
  it("counts inclusive billing days deterministically", () => {
    expect(inclusivePeriodDays("2026-02-01", "2026-02-28")).toBe(28);
  });

  it("creates a versionable software price-increase finding", () => {
    const finding = evaluateExpenseChange(current, prior);
    expect(finding?.ruleKey).toBe("software_price_increase");
    expect(finding?.calculationResult.increasePercent).toBe("32.86");
    expect(finding?.estimatedAnnualValue).toBe("386.87");
  });

  it("does not create a finding below the material threshold", () => {
    expect(evaluateExpenseChange({ ...current, amount: "92.00" }, prior)).toBeNull();
  });

  it("routes energy changes to review without inventing savings", () => {
    const finding = evaluateExpenseChange({ ...current, category: "Energy", amount: "130.00" }, { ...prior, category: "Energy" });
    expect(finding?.type).toBe("energy_review");
    expect(finding?.estimatedAnnualValue).toBeNull();
  });

  it("calculates annual recurring savings from comparable periods", () => {
    const result = calculateVerifiedAnnualSavings({ ...current, amount: "120.00" }, { ...prior, id: "later", amount: "90.00", periodStart: "2026-03-01", periodEnd: "2026-03-31" });
    expect(result?.amount).toBe("504.61");
  });

  it("refuses to verify energy savings without usage evidence", () => {
    expect(calculateVerifiedAnnualSavings({ ...current, category: "Energy" }, { ...prior, id: "later", category: "Energy", periodStart: "2026-03-01", periodEnd: "2026-03-31" })).toBeNull();
  });
});
