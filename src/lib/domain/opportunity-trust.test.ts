import { describe, expect, it } from "vitest";
import {
  canAdvanceOpportunityToApproval,
  canShowCustomerMonetaryClaim,
  deriveOpportunityTrustState,
} from "./opportunity-trust";

describe("opportunity trust", () => {
  const deterministic = {
    generatedBy: "deterministic_rule",
    sourceRecordId: "expense-1",
    evidenceCount: 2,
    ruleKey: "expense_change",
    ruleVersion: "2026.08.1",
    calculationInputs: { current: "125.00", prior: "100.00" },
    calculationResult: { annualizedRecurringSavings: "300.00" },
  };

  it("requires source, evidence, rule metadata, and calculation output", () => {
    expect(deriveOpportunityTrustState(deterministic)).toBe("evidence_backed");
    expect(deriveOpportunityTrustState({ ...deterministic, evidenceCount: 0 })).toBe("needs_evidence");
    expect(deriveOpportunityTrustState({ ...deterministic, calculationResult: {} })).toBe("needs_evidence");
  });

  it("keeps manual notes from becoming findings or savings claims", () => {
    const state = deriveOpportunityTrustState({
      ...deterministic,
      generatedBy: "manual",
      estimatedAnnualValue: 4_320,
    } as typeof deterministic & { estimatedAnnualValue: number });
    expect(state).toBe("manual_note");
    expect(canShowCustomerMonetaryClaim({
      trustState: state,
      estimatedAnnualValue: 4_320,
      evidenceCount: 20,
      ruleVersion: "2026.08.1",
      calculationInputs: deterministic.calculationInputs,
      calculationResult: deterministic.calculationResult,
    })).toBe(false);
  });

  it("preserves explicit sample and deprecated states", () => {
    expect(deriveOpportunityTrustState({ ...deterministic, explicitTrustState: "demo_example" })).toBe("demo_example");
    expect(deriveOpportunityTrustState({ ...deterministic, explicitTrustState: "deprecated" })).toBe("deprecated");
  });

  it("only permits an approval plan for a provenance-complete finding", () => {
    expect(canAdvanceOpportunityToApproval(deterministic)).toBe(true);
    expect(canAdvanceOpportunityToApproval({ ...deterministic, generatedBy: "manual" })).toBe(false);
    expect(canAdvanceOpportunityToApproval({ ...deterministic, evidenceCount: 0 })).toBe(false);
    expect(canAdvanceOpportunityToApproval({ ...deterministic, explicitTrustState: "demo_example" })).toBe(false);
  });
});
