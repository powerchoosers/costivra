/**
 * Policy guardrails for creating vendor and category candidates.
 */

const GENERIC_VENDOR_LABELS = new Set([
  "invoice",
  "statement",
  "bill",
  "billing",
  "billing department",
  "accounts receivable",
  "customer service",
  "vendor",
  "supplier",
  "merchant",
  "payment processor",
  "remittance",
  "remit to",
  "corporation",
  "company",
  "receipt",
]);

export type CandidateValidationResult =
  | { allowed: true; cleanName: string }
  | { allowed: false; reason: string };

/**
 * Validates whether an extracted vendor name is safe and qualified to create a global catalog candidate.
 */
export function validateVendorCandidatePolicy(rawName: string): CandidateValidationResult {
  if (!rawName || typeof rawName !== "string") {
    return { allowed: false, reason: "Vendor name is empty or missing." };
  }

  const trimmed = rawName.trim();
  if (trimmed.length < 2) {
    return { allowed: false, reason: "Vendor name is too short (minimum 2 characters)." };
  }

  if (trimmed.length > 120) {
    return { allowed: false, reason: "Vendor name is too long (maximum 120 characters)." };
  }

  const lower = trimmed.toLowerCase();
  if (GENERIC_VENDOR_LABELS.has(lower)) {
    return { allowed: false, reason: `Generic vendor label "${trimmed}" cannot be a candidate.` };
  }

  // Reject names consisting purely of numbers or special characters
  if (!/[a-zA-Z]/.test(trimmed)) {
    return { allowed: false, reason: "Vendor name must contain alphabetic characters." };
  }

  return { allowed: true, cleanName: trimmed };
}
