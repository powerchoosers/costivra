import { describe, it, expect } from "vitest";
import { planDeterministicBlocks, mergeAndDedupeBlockRequests } from "./presentation-planner";
import type { AssistantBoundedContext } from "./context-builder";

const mockContext: AssistantBoundedContext = {
  organizationName: "Test Org",
  currentViewContext: null,
  attachedDocuments: [],
  recentVendors: [
    { id: "v1", name: "AT&T Business", category: "Telecom", spend: 18420 },
    { id: "v2", name: "AWS", category: "Cloud", spend: 38420 },
  ],
  recentInvoices: [
    { id: "inv-2", vendorName: "AT&T Business", amount: 1535.42, date: "2026-07-31", status: "ready" },
    { id: "inv-1", vendorName: "AT&T Business", amount: 1410.10, date: "2026-06-30", status: "ready" },
  ],
  openOpportunities: [
    { id: "opp-1", title: "Unused mobility lines", estimatedAnnualValue: 4800, status: "under_review" },
  ],
  upcomingContracts: [
    { id: "c-1", title: "Telecom Service", vendorName: "AT&T Business", endDate: "2026-11-18", noticeDeadline: "2026-08-18", autoRenews: true },
  ],
};

describe("Presentation Planner", () => {
  it("selects spend_overview block for high-level spend queries", () => {
    const blocks = planDeterministicBlocks({
      prompt: "Summarize our recurring expenses",
      context: mockContext,
    });
    expect(blocks).toEqual([
      {
        type: "spend_overview",
        vendorRelationshipIds: ["v1", "v2"],
      },
    ]);
  });

  it("selects invoice_summary block for latest bill queries", () => {
    const blocks = planDeterministicBlocks({
      prompt: "Show our latest bill",
      context: mockContext,
    });
    expect(blocks).toEqual([
      {
        type: "invoice_summary",
        invoiceId: "inv-2",
      },
    ]);
  });

  it("selects invoice_comparison block for comparison queries", () => {
    const blocks = planDeterministicBlocks({
      prompt: "Compare our last two AT&T bills",
      context: mockContext,
    });
    expect(blocks).toEqual([
      {
        type: "invoice_comparison",
        invoiceIds: ["inv-1", "inv-2"],
      },
    ]);
  });

  it("selects renewal_timeline block for contract deadline queries", () => {
    const blocks = planDeterministicBlocks({
      prompt: "Which contracts have notice deadlines approaching?",
      context: mockContext,
    });
    expect(blocks).toEqual([
      {
        type: "renewal_timeline",
        contractIds: ["c-1"],
      },
    ]);
  });

  it("selects document_ingestion for attached files", () => {
    const blocks = planDeterministicBlocks({
      prompt: "Review this uploaded bill",
      context: mockContext,
      attachmentIds: ["doc-99"],
    });
    expect(blocks[0]).toEqual({
      type: "document_ingestion",
      documentId: "doc-99",
    });
  });

  it("deduplicates block requests and caps at maxBlocks", () => {
    const deterministic = [
      { type: "spend_overview" as const, vendorRelationshipIds: ["v1"] },
      { type: "invoice_summary" as const, invoiceId: "inv-2" },
    ];
    const model = [
      { type: "spend_overview" as const, vendorRelationshipIds: ["v1"] },
      { type: "opportunity" as const, opportunityId: "opp-1" },
    ];
    const merged = mergeAndDedupeBlockRequests(deterministic, model, 5);
    expect(merged.length).toBe(3);
    expect(merged.map((b) => b.type)).toEqual(["spend_overview", "invoice_summary", "opportunity"]);
  });
});
