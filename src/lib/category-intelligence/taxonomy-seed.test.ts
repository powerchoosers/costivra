import { describe, expect, it } from "vitest";
import { resolveCategory } from "./category-resolver";
import { getExpertPack } from "./packs";

describe("Packet 05: Supabase Taxonomy & Insurance Category Safety", () => {
  it("includes insurance-benefits parent and first-class insurance leaf categories in taxonomy", () => {
    const insuranceLeaves = [
      "commercial-property",
      "general-liability-bop",
      "workers-compensation",
      "commercial-auto",
      "cyber-insurance",
      "umbrella-excess",
      "group-health",
      "dental-vision-life-disability",
      "stop-loss-pbm-benefits-admin",
    ];

    for (const slug of insuranceLeaves) {
      const pack = getExpertPack(slug);
      expect(pack.categoryKey).toBe(slug);
      expect(pack.status).toBe("draft");
    }
  });

  it("resolves duplicate legacy string labels to canonical category keys", async () => {
    const gasRes = await resolveCategory({ rawCategory: "commercial natural gas" });
    expect(gasRes.key).toBe("commercial-natural-gas");
    expect(gasRes.confidence).toBeGreaterThan(0.9);

    const saasRes = await resolveCategory({ rawCategory: "saas subscriptions" });
    expect(saasRes.key).toBe("saas-subscriptions");
  });

  it("does not auto-force ambiguous multi-service vendors without explicit context", async () => {
    const attRes = await resolveCategory({ vendorName: "AT&T Business" });
    expect(attRes.key).toBe("general-operating-expenses");
    expect(attRes.confidence).toBe(0);

    const directEnergyRes = await resolveCategory({ vendorName: "Direct Energy" });
    expect(directEnergyRes.key).toBe("general-operating-expenses");
    expect(directEnergyRes.confidence).toBe(0);
  });

  it("prioritizes explicit invoice line items/text over ambiguous vendor name", async () => {
    const result = await resolveCategory({
      vendorName: "AT&T Business",
      lineItemDescriptions: ["Dedicated DIA Bandwidth Local Loop Circuit ID #100"],
    });
    expect(result.key).toBe("business-broadband-dia");
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it("returns neutral unknown draft pack for unclassified categories", () => {
    const pack = getExpertPack("unrecognized-custom-category");
    expect(pack.categoryKey).toBe("unrecognized-custom-category");
    expect(pack.status).toBe("draft");
    expect(pack.lineItems.length).toBe(0);
    expect(pack.benchmarkPolicy.prohibitedClaims.length).toBeGreaterThan(0);
  });
});
