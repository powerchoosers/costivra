export const OPPORTUNITY_TRUST_STATES = [
  "evidence_backed",
  "needs_evidence",
  "manual_note",
  "demo_example",
  "deprecated",
] as const;

export type OpportunityTrustState = (typeof OPPORTUNITY_TRUST_STATES)[number];

export type OpportunityTrustInput = {
  generatedBy: string | null;
  explicitTrustState?: string | null;
  sourceRecordId?: string | null;
  evidenceCount: number;
  ruleKey?: string | null;
  ruleVersion?: string | null;
  calculationInputs?: Record<string, unknown> | null;
  calculationResult?: Record<string, unknown> | null;
};

const nonEmptyObject = (value: Record<string, unknown> | null | undefined) =>
  Boolean(value && Object.keys(value).length > 0);

export function isOpportunityTrustState(value: unknown): value is OpportunityTrustState {
  return typeof value === "string" && OPPORTUNITY_TRUST_STATES.includes(value as OpportunityTrustState);
}

/**
 * Derives the customer-facing trust state from provenance, not from the title
 * or the presence of a dollar amount. Manual records never become proven just
 * because someone later attached a quote.
 */
export function deriveOpportunityTrustState(input: OpportunityTrustInput): OpportunityTrustState {
  if (input.explicitTrustState === "demo_example" || input.explicitTrustState === "deprecated") {
    return input.explicitTrustState;
  }
  if (input.generatedBy === "manual") return "manual_note";

  const isEvidenceBacked =
    input.generatedBy === "deterministic_rule" &&
    Boolean(input.sourceRecordId) &&
    input.evidenceCount > 0 &&
    Boolean(input.ruleKey) &&
    Boolean(input.ruleVersion) &&
    nonEmptyObject(input.calculationInputs) &&
    nonEmptyObject(input.calculationResult);

  return isEvidenceBacked ? "evidence_backed" : "needs_evidence";
}

export function canShowCustomerMonetaryClaim(input: {
  trustState: OpportunityTrustState;
  estimatedAnnualValue: number | null;
  evidenceCount: number;
  ruleVersion: string | null;
  calculationInputs: Record<string, unknown>;
  calculationResult: Record<string, unknown>;
}): boolean {
  return (
    input.trustState === "evidence_backed" &&
    input.estimatedAnnualValue != null &&
    input.evidenceCount > 0 &&
    Boolean(input.ruleVersion) &&
    nonEmptyObject(input.calculationInputs) &&
    nonEmptyObject(input.calculationResult)
  );
}

export function canAdvanceOpportunityToApproval(input: OpportunityTrustInput): boolean {
  return deriveOpportunityTrustState(input) === "evidence_backed";
}

export function opportunityTrustLabel(state: OpportunityTrustState): string {
  switch (state) {
    case "evidence_backed":
      return "Evidence backed";
    case "needs_evidence":
      return "Needs evidence";
    case "manual_note":
      return "Internal note";
    case "demo_example":
      return "Sample record";
    case "deprecated":
      return "Deprecated";
  }
}
