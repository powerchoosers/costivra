import { describe, expect, it } from "vitest";
import { buildClientAssistantSuggestions } from "./suggestions";
import type { AssistantBoundedContext } from "./context-builder";

function fixture(): AssistantBoundedContext {
  return {
    organizationName: "Apex Logistics",
    currentViewContext: null,
    currentContextCategory: null,
    attachedDocuments: [],
    recentVendors: [{ id: "vendor-1", name: "Relay", category: "software", spend: 0 }],
    recentInvoices: [{ id: "invoice-1", vendorName: "Relay", category: "software", amount: 0, date: "2026-08-01", status: "needs_review", documentId: null }],
    recentExpenses: [],
    verifiedSavings: [],
    pendingApprovals: [],
    supplierCatalog: [],
    recentLineItems: [],
    openOpportunities: [{ id: "opportunity-1", title: "Relay duplicate licenses", estimatedAnnualValue: 0, status: "under_review" }],
    upcomingContracts: [{ id: "contract-1", title: "Relay agreement", vendorName: "Relay", endDate: "2026-12-31", noticeDeadline: "2026-10-01", autoRenews: true }],
  };
}

describe("buildClientAssistantSuggestions", () => {
  it("prioritizes the earliest actionable contract with workspace-specific prompts", () => {
    const suggestions = buildClientAssistantSuggestions(fixture(), new Date("2026-08-11T00:00:00.000Z"));

    expect(suggestions).toHaveLength(3);
    expect(suggestions[0]).toMatchObject({ id: "contract-contract-1", kind: "contract" });
    expect(suggestions[0].detail).toContain("Oct 1, 2026");
    expect(suggestions[1].label).toContain("Relay duplicate licenses");
    expect(suggestions[2]).toMatchObject({ id: "invoice-invoice-1", kind: "invoice" });
  });

  it("returns a safe starting prompt when there are no records", () => {
    const empty = fixture();
    empty.recentVendors = [];
    empty.recentInvoices = [];
    empty.openOpportunities = [];
    empty.upcomingContracts = [];

    expect(buildClientAssistantSuggestions(empty)).toEqual([
      expect.objectContaining({ id: "start-review", kind: "review" }),
    ]);
  });
});
