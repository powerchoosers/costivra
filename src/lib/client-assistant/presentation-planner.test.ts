import { describe, it, expect } from "vitest";
import { filterRelevantModelBlockRequests, planDeterministicBlocks, mergeAndDedupeBlockRequests } from "./presentation-planner";
import type { AssistantBoundedContext } from "./context-builder";
import type { AssistantBlockRequest } from "./types";

const mockContext: AssistantBoundedContext = {
  organizationName: "Test Org",
  currentViewContext: null,
  currentContextCategory: null,
  attachedDocuments: [],
  recentVendors: [
    { id: "v1", name: "AT&T Business", category: "Telecom", spend: 18420 },
    { id: "v2", name: "AWS", category: "Cloud", spend: 38420 },
  ],
  recentInvoices: [
    { id: "inv-2", vendorName: "AT&T Business", category: "Telecom", amount: 1535.42, date: "2026-07-31", status: "ready", documentId: null },
    { id: "inv-1", vendorName: "AT&T Business", category: "Telecom", amount: 1410.10, date: "2026-06-30", status: "ready", documentId: null },
  ],
  recentExpenses: [],
  verifiedSavings: [],
  pendingApprovals: [],
  supplierCatalog: [],
  recentLineItems: [],
  openOpportunities: [
    { id: "opp-1", title: "Unused mobility lines", estimatedAnnualValue: 4800, status: "under_review" },
  ],
  upcomingContracts: [
    { id: "c-1", title: "Telecom Service", vendorName: "AT&T Business", endDate: "2026-11-18", noticeDeadline: "2026-08-18", autoRenews: true },
  ],
  monitoringConfigs: [],
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

  it("selects an invoice ranking card for expensive bill questions", () => {
    const blocks = planDeterministicBlocks({
      prompt: "What are some of my most expensive bills?",
      context: mockContext,
    });
    expect(blocks).toEqual([
      { type: "invoice_ranking", invoiceIds: ["inv-2", "inv-1"] },
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

  it("selects supplier reference options for non-energy renewal questions", () => {
    const blocks = planDeterministicBlocks({
      prompt: "Who should we renew our telecom service with?",
      context: {
        ...mockContext,
        currentContextCategory: "Telecom",
        supplierCatalog: [
          { id: "supplier-1", name: "Verizon Business", category: "Telecom", website: "verizon.com", status: "verified" },
        ],
      },
    });
    expect(blocks).toContainEqual({
      type: "supplier_options",
      category: "Telecom",
      currentVendorName: "AT&T Business",
    });
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

  it("selects a spend trend for natural history questions", () => {
    const blocks = planDeterministicBlocks({
      prompt: "Where did recurring spend increase most over time?",
      context: mockContext,
    });
    expect(blocks).toContainEqual({
      type: "spend_trend",
    });
  });

  it("keeps a named vendor trend scoped to that vendor", () => {
    const blocks = planDeterministicBlocks({
      prompt: "Show the AT&T Business spend trend over the last 6 months",
      context: mockContext,
    });
    expect(blocks).toContainEqual({
      type: "spend_trend",
      vendorRelationshipId: "v1",
    });
  });

  it("selects the energy review path when the question names energy", () => {
    const blocks = planDeterministicBlocks({
      prompt: "Who should we renew our energy contract with?",
      context: {
        ...mockContext,
        currentContextCategory: null,
        recentVendors: [
          { id: "energy-vendor", name: "TXU Energy", category: "Commercial Energy", spend: 10000 },
        ],
        supplierCatalog: [
          { id: "energy-supplier", name: "Reliant", category: "Commercial Energy", website: "reliant.com", status: "verified" },
        ],
      },
    });
    expect(blocks).toContainEqual({
      type: "energy_review_path",
      vendorRelationshipId: "energy-vendor",
    });
  });

  it("keeps renewal advice scoped to the active vendor record", () => {
    const blocks = planDeterministicBlocks({
      prompt: "Who should we renew with?",
      context: {
        ...mockContext,
        currentContextCategory: "Commercial Energy",
        recentVendors: [
          { id: "active-energy", name: "Active Utility", category: "Commercial Energy", spend: 1000 },
          { id: "other-energy", name: "Other Utility", category: "Commercial Energy", spend: 50000 },
        ],
      },
      contextRef: { kind: "vendor", id: "active-energy" },
    });

    expect(blocks).toContainEqual({
      type: "energy_review_path",
      vendorRelationshipId: "active-energy",
    });
  });

  it("uses an active vendor id even when it is outside the recent-vendor summary", () => {
    const blocks = planDeterministicBlocks({
      prompt: "Show the spend trend over the last six months",
      context: { ...mockContext, currentContextCategory: "Telecom" },
      contextRef: { kind: "vendor", id: "outside-recent-vendor" },
    });

    expect(blocks).toContainEqual({
      type: "spend_trend",
      vendorRelationshipId: "outside-recent-vendor",
    });
  });

  it("keeps a valid active-vendor trend request when the summary is empty", () => {
    const blocks = planDeterministicBlocks({
      prompt: "Show the monthly spend trend",
      context: { ...mockContext, recentVendors: [] },
      contextRef: { kind: "vendor", id: "active-vendor" },
    });

    expect(blocks).toContainEqual({
      type: "spend_trend",
      vendorRelationshipId: "active-vendor",
    });
  });

  it("does not treat a general supplier question as energy because the catalog has an energy supplier", () => {
    const blocks = planDeterministicBlocks({
      prompt: "Who should we renew our software contract with?",
      context: {
        ...mockContext,
        currentContextCategory: "Software subscriptions",
        recentVendors: [
          { id: "software-vendor", name: "Acme Software", category: "Software subscriptions", spend: 12000 },
        ],
        supplierCatalog: [
          { id: "energy-1", name: "Energy Partner", category: "Commercial Energy", website: null, status: "verified" },
          { id: "software-1", name: "Software Candidate", category: "Software subscriptions", website: null, status: "candidate" },
        ],
      },
    });

    expect(blocks).toContainEqual({
      type: "supplier_options",
      category: "Software subscriptions",
      currentVendorName: "Acme Software",
    });
    expect(blocks.some((block) => block.type === "energy_review_path")).toBe(false);
    expect(blocks.some((block) => block.type === "vendor_summary")).toBe(false);
  });

  it("does not infer energy from the highest-spend vendor when the prompt names software", () => {
    const blocks = planDeterministicBlocks({
      prompt: "Who should we renew our software subscription with?",
      context: {
        ...mockContext,
        currentContextCategory: null,
        recentVendors: [
          { id: "energy-vendor", name: "TXU Energy", category: "Commercial Energy", spend: 185000 },
          { id: "software-vendor", name: "Salesforce Inc.", category: "Software subscriptions", spend: 85000 },
        ],
        supplierCatalog: [
          { id: "software-1", name: "Software Candidate", category: "Software", website: null, status: "candidate" },
        ],
      },
    });

    expect(blocks).toContainEqual(expect.objectContaining({
      type: "supplier_options",
      category: "Software",
      currentVendorName: "Salesforce Inc.",
    }));
    expect(blocks.some((block) => block.type === "energy_review_path")).toBe(false);
  });

  it("uses the category named in an otherwise ambiguous workspace renewal question", () => {
    const blocks = planDeterministicBlocks({
      prompt: "Show software suppliers we could evaluate before renewal",
      context: {
        ...mockContext,
        currentContextCategory: null,
        supplierCatalog: [
          { id: "software-1", name: "Software Candidate", category: "Software", website: null, status: "candidate" },
        ],
      },
    });

    expect(blocks).toContainEqual(expect.objectContaining({ type: "supplier_options", category: "Software" }));
  });

  it("does not show a supplier card when no category is known", () => {
    const blocks = planDeterministicBlocks({
      prompt: "Who should we renew with?",
      context: {
        ...mockContext,
        currentContextCategory: null,
        recentVendors: [
          { id: "software-vendor", name: "Acme Software", category: "Software", spend: 12000 },
          { id: "telecom-vendor", name: "Acme Telecom", category: "Telecom", spend: 8000 },
        ],
        supplierCatalog: [
          { id: "software-1", name: "Software Candidate", category: "Software", website: null, status: "candidate" },
          { id: "telecom-1", name: "Telecom Candidate", category: "Telecom", website: null, status: "candidate" },
        ],
      },
    });

    expect(blocks.some((block) => block.type === "supplier_options")).toBe(false);
  });

  it("selects a monitoring overview for bill-feed questions", () => {
    const blocks = planDeterministicBlocks({
      prompt: "Which vendors are currently monitored for incoming bills?",
      context: { ...mockContext, recentVendors: [{ id: "vendor-1", name: "Acme", category: "Software", spend: 1200 }] },
    });
    expect(blocks).toContainEqual({ type: "monitoring_overview" });
  });

  it("selects the verified savings card for verified-value questions", () => {
    const blocks = planDeterministicBlocks({
      prompt: "How much verified value have we created?",
      context: {
        ...mockContext,
        verifiedSavings: [
          { id: "saving-1", title: "Telecom credit", amount: 620, currency: "USD", status: "verified", verifiedAt: "2026-08-01" },
        ],
      },
    });
    expect(blocks).toContainEqual({ type: "savings_summary", savingsIds: ["saving-1"] });
  });

  it("selects the approval queue card when decisions are pending", () => {
    const blocks = planDeterministicBlocks({
      prompt: "What needs approval right now?",
      context: {
        ...mockContext,
        pendingApprovals: [
          { id: "approval-1", resourceType: "opportunity", resourceId: "opp-1", decision: "pending", createdAt: "2026-08-01" },
        ],
      },
    });
    expect(blocks).toContainEqual({ type: "approval_queue", actionIds: ["approval-1"] });
  });

  it("filters model cards that are unrelated to the prompt", () => {
    const requests: AssistantBlockRequest[] = [
      { type: "supplier_options", category: "Software" },
      { type: "invoice_comparison", invoiceIds: ["energy-invoice", "energy-invoice"] },
      { type: "vendor_summary", vendorRelationshipId: "energy-vendor" },
    ];
    const filtered = filterRelevantModelBlockRequests(
      "Which software vendors should I compare before renewal?",
      {
        ...mockContext,
        currentContextCategory: null,
        recentVendors: [
          { id: "energy-vendor", name: "TXU Energy", category: "Commercial Energy", spend: 185000 },
          { id: "software-vendor", name: "Salesforce Inc.", category: "Software subscriptions", spend: 85000 },
        ],
        recentInvoices: [
          { id: "energy-invoice", vendorName: "TXU Energy", category: "Commercial Energy", amount: 1000, date: "2026-07-31", status: "ready", documentId: null },
        ],
      },
      null,
      requests,
    );

    expect(filtered).toEqual([{ type: "supplier_options", category: "Software" }]);
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

  it("deduplicates deterministic and model invoice-ranking cards", () => {
    const merged = mergeAndDedupeBlockRequests(
      [{ type: "invoice_ranking", invoiceIds: ["inv-1", "inv-2"] }],
      [{ type: "invoice_ranking" }],
    );
    expect(merged).toEqual([{ type: "invoice_ranking", invoiceIds: ["inv-1", "inv-2"] }]);
  });
});
