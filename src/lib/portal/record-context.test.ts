import { describe, expect, it } from "vitest";
import { portalRecordContext } from "@/lib/portal/record-context";
import type { PortalData } from "@/lib/portal/types";

function data(overrides: Partial<PortalData> = {}): PortalData {
  return {
    organization: {} as PortalData["organization"],
    currentUser: {} as PortalData["currentUser"],
    locations: [],
    vendors: [],
    vendorCatalog: [],
    expenseAccounts: [],
    expenses: [],
    contracts: [],
    documents: [],
    invoices: [],
    invoiceLineItems: [],
    opportunities: [],
    actions: [],
    approvalPolicies: [],
    savings: [],
    integrations: [],
    emailIntake: null,
    inboundEmailEvents: [],
    reports: [],
    team: [],
    notifications: [],
    auditEvents: [],
    evidenceReferences: [],
    ...overrides,
  };
}

describe("portal record context", () => {
  it("connects an invoice to its source, line items, evidence, vendor, and cases", () => {
    const result = portalRecordContext(data({
      vendors: [{ id: "vendor-1", name: "Acme Telecom", relationshipStatus: "active" } as PortalData["vendors"][number]],
      documents: [{ id: "doc-1", vendorId: "vendor-1", originalFilename: "invoice.pdf", status: "ready" } as PortalData["documents"][number]],
      invoices: [{ id: "invoice-1", documentId: "doc-1", vendorId: "vendor-1", invoiceNumber: "INV-42", vendorMatchStatus: "exact", workspaceCustomerMatchStatus: "matched", expenseAccountMatchStatus: "matched", serviceLocationMatchStatus: "matched", reconciliationStatus: "reconciled", invoiceDate: "2026-07-01", totalAmount: 125, reviewStatus: "approved" } as PortalData["invoices"][number]],
      invoiceLineItems: [{ id: "line-1", invoiceId: "invoice-1", lineNumber: 1, description: "Internet service", quantity: 1, unitPrice: 125, amount: 125, category: "Telecom", servicePeriodStart: null, servicePeriodEnd: null }],
      evidenceReferences: [{ id: "evidence-1", documentId: "doc-1", opportunityId: null, pageNumber: 1, fieldPath: "totalAmount", textExcerpt: "Total $125.00" }],
      contracts: [{ id: "contract-1", vendorId: "vendor-1", title: "Internet agreement", status: "active" } as PortalData["contracts"][number]],
      opportunities: [{ id: "opportunity-1", vendorId: "vendor-1", title: "Review rate increase", status: "open" } as PortalData["opportunities"][number]],
    }), "invoice", "invoice-1");

    expect(result.lineItems).toHaveLength(1);
    expect(result.evidence.map((item) => item.id)).toEqual(["evidence-1"]);
    expect(result.related.map((item) => item.href)).toEqual(expect.arrayContaining([
      "/app/bills/doc-1",
      "/app/vendors/vendor-1",
      "/app/contracts/contract-1",
      "/app/findings/opportunity-1",
    ]));
    expect(result.quality.every((item) => item.status === "ready")).toBe(true);
  });

  it("connects an action to the exact opportunity, evidence, and savings outcome", () => {
    const result = portalRecordContext(data({
      documents: [{ id: "doc-1", vendorId: "vendor-1", originalFilename: "bill.pdf", status: "ready" } as PortalData["documents"][number]],
      opportunities: [{ id: "opportunity-1", vendorId: "vendor-1", title: "Review increase", status: "approved" } as PortalData["opportunities"][number]],
      actions: [{ id: "action-1", opportunityId: "opportunity-1", vendorId: "vendor-1", title: "Prepare review", status: "pending_approval", approvedCount: 1, requiredApprovals: 2, approvalPolicyId: "policy-1", approvalPolicyName: "Two-person review", dueAt: null } as PortalData["actions"][number]],
      savings: [{ id: "savings-1", opportunityId: "opportunity-1", title: "Verify savings", status: "baseline_review", baselineExpenseId: null, comparisonExpenseId: null } as PortalData["savings"][number]],
      evidenceReferences: [{ id: "evidence-1", documentId: "doc-1", opportunityId: "opportunity-1", pageNumber: 1, fieldPath: "amount", textExcerpt: "$125" }],
    }), "action", "action-1");

    expect(result.related.map((item) => item.href)).toEqual(expect.arrayContaining([
      "/app/findings/opportunity-1",
      "/app/results/savings-1",
    ]));
    expect(result.evidence).toHaveLength(1);
    expect(result.quality.find((item) => item.label === "Approval")?.status).toBe("review");
  });

  it("uses plain language instead of raw invoice matching and reconciliation codes", () => {
    const result = portalRecordContext(data({
      invoices: [{
        id: "invoice-1",
        vendorMatchStatus: "enriched_candidate",
        workspaceCustomerMatchStatus: "unknown",
        expenseAccountMatchStatus: "unmatched",
        serviceLocationMatchStatus: "ambiguous",
        reconciliationStatus: "incomplete",
        invoiceNumber: "INV-42",
        invoiceDate: "2026-07-01",
        totalAmount: 125,
      } as PortalData["invoices"][number]],
    }), "invoice", "invoice-1");

    expect(Object.fromEntries(result.quality.map((item) => [item.label, item.value]))).toMatchObject({
      "Vendor match": "Candidate found",
      "Account match": "Mismatch",
      "Location match": "Needs review",
      "Customer identity": "Not assessed",
      Reconciliation: "Needs more detail",
    });
  });

  it("does not mark a recorded but unavailable finding reference as evidence-ready", () => {
    const result = portalRecordContext(data({
      opportunities: [{
        id: "opportunity-1",
        title: "Review rate increase",
        status: "under_review",
        trustState: "demo_example",
        evidenceCount: 1,
      } as PortalData["opportunities"][number]],
    }), "opportunity", "opportunity-1");

    expect(result.quality.find((item) => item.label === "Evidence")).toMatchObject({
      value: "1 recorded reference; source unavailable in this workspace",
      status: "review",
    });
  });

  it("requires deterministic output as well as a rule before a finding calculation is ready", () => {
    const incomplete = portalRecordContext(data({
      opportunities: [{
        id: "opportunity-1",
        title: "Review rate increase",
        status: "under_review",
        trustState: "evidence_backed",
        ruleVersion: "rate-increase-v1",
        calculationResult: {},
      } as unknown as PortalData["opportunities"][number]],
    }), "opportunity", "opportunity-1");
    const complete = portalRecordContext(data({
      opportunities: [{
        id: "opportunity-1",
        title: "Review rate increase",
        status: "under_review",
        trustState: "evidence_backed",
        ruleVersion: "rate-increase-v1",
        calculationResult: { annualizedRecurringSavings: "1200.00" },
      } as unknown as PortalData["opportunities"][number]],
    }), "opportunity", "opportunity-1");

    expect(incomplete.quality.find((item) => item.label === "Calculation")).toMatchObject({
      value: "Rule recorded; result needed",
      status: "review",
    });
    expect(complete.quality.find((item) => item.label === "Calculation")).toMatchObject({
      value: "Recorded · rate-increase-v1",
      status: "ready",
    });
  });

  it("does not present a legacy verified result as evidence-complete", () => {
    const result = portalRecordContext(data({
      savings: [{
        id: "savings-1",
        title: "Legacy credit",
        status: "verified",
        verifiedAt: "2026-07-30",
        amount: 620,
        baselineAmount: null,
        comparisonAmount: null,
        baselineAcceptedAt: null,
        baselineExpenseId: null,
        comparisonExpenseId: null,
        methodVersion: null,
        calculationResult: {},
      } as PortalData["savings"][number]],
    }), "savings", "savings-1");

    expect(result.quality.find((item) => item.label === "Verification")).toMatchObject({
      value: "Evidence incomplete",
      status: "review",
    });
  });
});
