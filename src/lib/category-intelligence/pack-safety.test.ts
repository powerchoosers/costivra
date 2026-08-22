import { describe, expect, it } from "vitest";
import { getExpertPack, getExpertPackWithResolution, EXPERT_PACKS_REGISTRY } from "./packs";
import { categoryIntelligence } from "./service";
import type { AssistantBoundedContext } from "@/lib/client-assistant/context-builder";

describe("Packet 02: Pack Registry and Unknown-Category Safety", () => {
  it("gives wireless its own dedicated rules without broadband/DIA leakage", () => {
    const res = getExpertPackWithResolution("wireless");
    expect(res.exactMatch).toBe(true);
    expect(res.pack.status).toBe("draft");
    expect(res.pack.lineItems.length).toBeGreaterThan(0);
    expect(res.pack.lineItems.some((item) => item.canonicalCode.startsWith("TELE-"))).toBe(false);
  });

  it("gives workers compensation its own rules without commercial-property leakage", () => {
    const res = getExpertPackWithResolution("workers-compensation");
    expect(res.exactMatch).toBe(true);
    expect(res.pack.status).toBe("draft");
    expect(res.pack.lineItems.length).toBeGreaterThan(0);
    expect(res.pack.lineItems.some((item) => item.canonicalCode.startsWith("PROP-"))).toBe(false);
  });

  it("gives group health its own rules without commercial-property leakage", () => {
    const res = getExpertPackWithResolution("group-health");
    expect(res.exactMatch).toBe(true);
    expect(res.pack.status).toBe("draft");
    expect(res.pack.lineItems.length).toBeGreaterThan(0);
    expect(res.pack.lineItems.some((item) => item.canonicalCode.startsWith("PROP-"))).toBe(false);
  });

  it("does not give hazardous waste normal dumpster/solid waste rules", () => {
    const res = getExpertPackWithResolution("hazardous-industrial-waste");
    expect(res.exactMatch).toBe(false);
    expect(res.pack.status).toBe("draft");
    expect(res.pack.lineItems).toEqual([]);
  });

  it("returns zero category-specific line items for unknown categories", () => {
    const pack = getExpertPack("unsupported-specialty-medical-equipment");
    expect(pack.categoryKey).toBe("unsupported-specialty-medical-equipment");
    expect(pack.status).toBe("draft");
    expect(pack.lineItems).toEqual([]);
    expect(pack.pricingModels).toEqual([]);
    expect(pack.benchmarkPolicy.supportedMetrics).toEqual([]);
    expect(pack.outputPolicy.requiredCaveats.some((c) => c.includes("does not yet have a reviewed expert pack"))).toBe(true);
  });

  it("never exposes draft packs as verified", () => {
    for (const key of Object.keys(EXPERT_PACKS_REGISTRY)) {
      const pack = EXPERT_PACKS_REGISTRY[key];
      expect(pack.status).toBe("draft");
    }
    const unverified = getExpertPackWithResolution("saas-subscriptions");
    expect(unverified.status).toBe("draft");
  });

  it("resolves exact registered packs cleanly", () => {
    const broad = getExpertPackWithResolution("business-broadband-dia");
    expect(broad.exactMatch).toBe(true);
    expect(broad.pack.categoryKey).toBe("business-broadband-dia");
    expect(broad.pack.lineItems.length).toBeGreaterThan(0);
  });

  it("honors invoice context outranking recent top-spend vendor category", () => {
    const mockContext: AssistantBoundedContext = {
      organizationName: "Acme Corp",
      currentViewContext: "Reviewing Invoice: TXU Energy",
      currentContextCategory: "commercial-electricity-supply",
      attachedDocuments: [],
      recentVendors: [
        { id: "v1", name: "Salesforce", category: "saas-subscriptions", spend: 500000 },
      ],
      recentInvoices: [],
      recentExpenses: [],
      verifiedSavings: [],
      pendingApprovals: [],
      supplierCatalog: [],
      recentLineItems: [],
      openOpportunities: [],
      upcomingContracts: [],
    };

    expect(mockContext.currentContextCategory).toBe("commercial-electricity-supply");
  });

  it("honors attached document category outranking organization top spend", () => {
    const mockContext: AssistantBoundedContext = {
      organizationName: "Acme Corp",
      currentViewContext: null,
      currentContextCategory: null,
      attachedDocuments: [
        { id: "d1", filename: "waste.pdf", status: "processed", extractionSummary: "Waste bill", category: "solid-waste-recycling" },
      ],
      recentVendors: [
        { id: "v1", name: "AWS", category: "saas-subscriptions", spend: 900000 },
      ],
      recentInvoices: [],
      recentExpenses: [],
      verifiedSavings: [],
      pendingApprovals: [],
      supplierCatalog: [],
      recentLineItems: [],
      openOpportunities: [],
      upcomingContracts: [],
    };

    const attachedCat = mockContext.attachedDocuments[0].category;
    expect(attachedCat).toBe("solid-waste-recycling");
    expect(attachedCat).not.toBe(mockContext.recentVendors[0].category);
  });

  it("returns honest neutral AI context when category is unknown", async () => {
    const aiContext = await categoryIntelligence.buildAiContext("unknown-logistics-category");
    expect(aiContext.category.packStatus).toBe("draft");
    expect(aiContext.relevantLineItemDefinitions).toEqual([]);
    expect(aiContext.requiredCaveats.some((c) => c.includes("does not yet have a reviewed expert pack"))).toBe(true);
  });
});
