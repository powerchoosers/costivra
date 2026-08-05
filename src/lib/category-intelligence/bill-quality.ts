import { BillQualityResult, CategoryFinding } from "./types";

export type AnalyzeBillInput = {
  invoiceId?: string;
  totalAmount: number;
  subtotalAmount?: number | null;
  taxAmount?: number | null;
  currency?: string;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  vendorMatchStatus?: string | null;
  reconciliationStatus?: string | null;
  lineItems?: Array<{ description: string; amount: number }>;
  categoryKey?: string;
};

/**
 * Computes deterministic bill quality findings and status score.
 */
export function analyzeBillQuality(input: AnalyzeBillInput): BillQualityResult {
  const findings: CategoryFinding[] = [];
  const missingFields: string[] = [];

  const total = Number(input.totalAmount || 0);
  const subtotal = input.subtotalAmount != null ? Number(input.subtotalAmount) : null;
  const tax = input.taxAmount != null ? Number(input.taxAmount) : null;

  // 1. Missing key fields
  if (!input.invoiceNumber) {
    missingFields.push("invoice_number");
    findings.push({
      findingId: "fnd-missing-inv-num",
      code: "missing_information",
      severity: "info",
      title: "Missing Invoice Identifier",
      message: "No explicit invoice number or bill tracking ID was detected in source document.",
      evidence: [],
      confidence: 1.0,
      financialImpact: null,
      nextAction: "Verify vendor statement or invoice header for missing bill identifier.",
      currentResearchPerformed: false,
    });
  }

  if (!input.invoiceDate) {
    missingFields.push("invoice_date");
  }

  if (!input.dueDate) {
    missingFields.push("due_date");
  }

  // 2. Arithmetic Reconciliation Check
  if (subtotal != null && tax != null && total > 0) {
    const calculatedTotal = subtotal + tax;
    const diff = Math.abs(total - calculatedTotal);
    if (diff > 0.05) {
      findings.push({
        findingId: "fnd-arithmetic-mismatch",
        code: "arithmetic_mismatch",
        severity: "high",
        title: "Arithmetic Total Mismatch",
        message: `Billed total ($${total.toFixed(2)}) does not equal subtotal ($${subtotal.toFixed(2)}) + tax ($${tax.toFixed(2)}). Variance: $${diff.toFixed(2)}.`,
        evidence: [`total: $${total}`, `subtotal: $${subtotal}`, `tax: $${tax}`],
        confidence: 1.0,
        financialImpact: diff,
        nextAction: "Request line-item correction or credit memo from vendor prior to payment.",
        currentResearchPerformed: false,
      });
    }
  }

  // 3. Tax Ratio Check
  if (tax != null && total > 0) {
    const taxRatio = tax / total;
    if (taxRatio > 0.18) {
      findings.push({
        findingId: "fnd-high-tax-ratio",
        code: "tax_or_fee_question",
        severity: "medium",
        title: "Elevated Tax / Surcharge Ratio",
        message: `Tax and surcharges ($${tax.toFixed(2)}) represent ${(taxRatio * 100).toFixed(1)}% of total bill amount ($${total.toFixed(2)}), exceeding the standard 15% threshold.`,
        evidence: [`tax_amount: $${tax}`, `total_amount: $${total}`],
        confidence: 0.95,
        financialImpact: tax * 0.25, // potential overcharge portion
        nextAction: "Review tax exemption certificate or tax basis calculations.",
        currentResearchPerformed: false,
      });
    }
  }

  // 4. Vendor Identity Match Status
  if (input.vendorMatchStatus === "unmatched" || input.vendorMatchStatus === "enriched_candidate") {
    findings.push({
      findingId: "fnd-unverified-vendor",
      code: "unverified_vendor",
      severity: "medium",
      title: "Unverified Vendor Identity",
      message: "Vendor relationship is newly created or unverified against organizational catalog.",
      evidence: [`vendor_match_status: ${input.vendorMatchStatus}`],
      confidence: 0.90,
      financialImpact: null,
      nextAction: "Verify canonical vendor W-9 and payment instructions in vendor master record.",
      currentResearchPerformed: false,
    });
  }

  // Determine Overall Quality Status
  let status: BillQualityResult["status"] = "good";
  let score = 95;

  const hasHighOrCritical = findings.some((f) => f.severity === "high" || f.severity === "critical");
  const hasMedium = findings.some((f) => f.severity === "medium");

  if (hasHighOrCritical) {
    status = "bad";
    score = 55;
  } else if (hasMedium) {
    status = "review";
    score = 75;
  } else if (missingFields.length > 2) {
    status = "insufficient_data";
    score = 65;
  }

  return {
    status,
    score,
    scoreVersion: "2026.08.1",
    findings,
    missingFields,
    benchmarkStatus: "insufficient_data",
    packVersion: "2026.08.1",
  };
}
