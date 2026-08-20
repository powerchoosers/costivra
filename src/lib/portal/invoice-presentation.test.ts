import { describe, expect, it } from "vitest";
import {
  invoiceIdentityMatchLabel,
  invoiceReconciliationLabel,
  invoiceVendorMatchIsReady,
  invoiceVendorMatchLabel,
} from "@/lib/portal/invoice-presentation";

describe("invoice presentation labels", () => {
  it("translates internal matching states into customer-readable labels", () => {
    expect(invoiceVendorMatchLabel("catalog_exact")).toBe("Matched");
    expect(invoiceVendorMatchLabel("enriched_candidate")).toBe("Candidate found");
    expect(invoiceVendorMatchLabel("fuzzy")).toBe("Needs confirmation");
    expect(invoiceIdentityMatchLabel("unknown")).toBe("Not assessed");
    expect(invoiceIdentityMatchLabel("unmatched")).toBe("Mismatch");
  });

  it("keeps match readiness and reconciliation labels explicit", () => {
    expect(invoiceVendorMatchIsReady("catalog_exact")).toBe(true);
    expect(invoiceVendorMatchIsReady("enriched_candidate")).toBe(false);
    expect(invoiceReconciliationLabel("reconciled")).toBe("Reconciled");
    expect(invoiceReconciliationLabel("incomplete")).toBe("Needs more detail");
    expect(invoiceReconciliationLabel("mismatch")).toBe("Totals differ");
  });
});
