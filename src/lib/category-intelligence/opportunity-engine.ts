import { BillQualityResult } from "./types";

export type CategoryOpportunity = {
  id: string;
  categoryKey: string;
  type: "overcharge" | "contract_variance" | "usage_optimization" | "market_quote_opportunity";
  title: string;
  description: string;
  estimatedAnnualSavings: number;
  confidence: number;
  evidence: string[];
  requiresHumanReview: boolean;
  ruleVersion: string;
};

/**
 * Evaluates category findings and computes deterministic savings opportunities.
 */
export function evaluateCategoryOpportunities(
  qualityResult: BillQualityResult,
  billedAmount: number,
  categoryKey: string
): CategoryOpportunity[] {
  const opps: CategoryOpportunity[] = [];

  for (const finding of qualityResult.findings) {
    if (finding.code === "arithmetic_mismatch" && finding.financialImpact) {
      opps.push({
        id: `opp-arithmetic-${finding.findingId}`,
        categoryKey,
        type: "overcharge",
        title: "Arithmetic Overcharge Correction",
        description: finding.message,
        estimatedAnnualSavings: Math.round(finding.financialImpact * 12),
        confidence: 1.0,
        evidence: finding.evidence,
        requiresHumanReview: false,
        ruleVersion: qualityResult.packVersion,
      });
    }

    if (finding.code === "tax_or_fee_question" && finding.financialImpact) {
      opps.push({
        id: `opp-tax-${finding.findingId}`,
        categoryKey,
        type: "contract_variance",
        title: "Tax Basis & Surcharge Exemption Audit",
        description: finding.message,
        estimatedAnnualSavings: Math.round(finding.financialImpact * 12),
        confidence: 0.90,
        evidence: finding.evidence,
        requiresHumanReview: true,
        ruleVersion: qualityResult.packVersion,
      });
    }
  }

  // Market quote opportunity when billed amount is large and benchmark status is directional/quote_required
  if (billedAmount > 1000 && qualityResult.findings.length === 0) {
    opps.push({
      id: `opp-quote-${categoryKey}`,
      categoryKey,
      type: "market_quote_opportunity",
      title: `${categoryKey.toUpperCase()} Contract Rate Review`,
      description: "Annual spend volume qualifies for competitive market quote comparison upon contract renewal.",
      estimatedAnnualSavings: Math.round(billedAmount * 0.10 * 12),
      confidence: 0.85,
      evidence: [`annualized_spend_tier: $${Math.round(billedAmount * 12).toLocaleString()}`],
      requiresHumanReview: true,
      ruleVersion: qualityResult.packVersion,
    });
  }

  return opps;
}
