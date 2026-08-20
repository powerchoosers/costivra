export function invoiceVendorMatchLabel(status: string | null | undefined) {
  const normalized = status?.trim().toLowerCase();
  if (["exact", "provided", "catalog_exact", "matched"].includes(normalized ?? "")) return "Matched";
  if (normalized === "enriched_candidate") return "Candidate found";
  if (normalized === "fuzzy") return "Needs confirmation";
  if (!normalized || normalized === "unknown") return "Not assessed";
  return "Needs review";
}

export function invoiceVendorMatchIsReady(status: string | null | undefined) {
  return ["exact", "provided", "catalog_exact", "matched"].includes(status?.trim().toLowerCase() ?? "");
}

export function invoiceIdentityMatchLabel(status: string | null | undefined) {
  const normalized = status?.trim().toLowerCase();
  if (normalized === "matched") return "Matched";
  if (normalized === "unmatched") return "Mismatch";
  if (!normalized || normalized === "unknown") return "Not assessed";
  return "Needs review";
}

export function invoiceReconciliationLabel(status: string | null | undefined) {
  switch (status?.trim().toLowerCase()) {
    case "reconciled": return "Reconciled";
    case "mismatch": return "Totals differ";
    case "incomplete": return "Needs more detail";
    case "not_run": return "Not run";
    default: return "Needs review";
  }
}
