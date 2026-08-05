import { describe, expect, it } from "vitest";
import { categoryIntelligence } from "../service";
import { evaluateMarketBenchmark } from "../benchmark-engine";
import { sanitizeSearchQuery } from "../current-market-research";
import { getExpertPack, hasDedicatedExpertPack } from "../packs";

describe("Category Intelligence Layer Verification", () => {
  it("resolves canonical categories correctly from vendor and line item text", async () => {
    const energy = await categoryIntelligence.resolveCategory({
      vendorName: "TXU Energy",
      lineItemDescriptions: ["kWh Generation Charge", "kW Peak Demand"],
    });
    expect(energy.key).toBe("commercial-electricity-supply");
    expect(energy.parentKey).toBe("energy-utilities");

    const insurance = await categoryIntelligence.resolveCategory({
      vendorName: "Hartford Commercial",
      lineItemDescriptions: [
        "Workers Comp Class Code 8810",
        "Experience Mod 0.92",
      ],
    });
    expect(insurance.key).toBe("workers-compensation");
    expect(insurance.parentKey).toBe("insurance-benefits");
    expect(insurance.expertPackVersion).toBe("2026.08.2-draft");
  });

  it("keeps broad categories broad instead of forcing a leaf market", async () => {
    const telecom = await categoryIntelligence.resolveCategory({
      rawCategory: "Telecom & Internet",
    });
    const insurance = await categoryIntelligence.resolveCategory({
      rawCategory: "Insurance",
    });

    expect(telecom.key).toBe("telecom-connectivity");
    expect(telecom.confidence).toBeLessThan(0.8);
    expect(insurance.key).toBe("insurance-benefits");
    expect(insurance.confidence).toBeLessThan(0.8);
  });

  it("returns insufficient_data when required dimensions are absent", () => {
    const result = evaluateMarketBenchmark({
      categoryKey: "commercial-electricity-supply",
      metric: "effective_rate",
      billedAmount: 1500,
    });

    expect(result.status).toBe("insufficient_data");
    expect(result.estimatedMarketRate).toBeNull();
    expect(result.potentialAnnualSavings).toBeNull();
    expect(result.missingDimensions.length).toBeGreaterThan(0);
    expect(result.caveats.some((caveat) => caveat.includes("fixed percentage"))).toBe(true);
  });

  it("still requires a current quote when descriptive dimensions exist", () => {
    const result = evaluateMarketBenchmark({
      categoryKey: "commercial-electricity-supply",
      metric: "effective_rate",
      billedAmount: 1500,
      geography: { state: "TX", zip: "75001" },
      volume: 100000,
      contractTermMonths: 36,
      specification: {
        utility: "Oncor",
        loadFactor: 0.62,
      },
    });

    expect(result.status).toBe("quote_required");
    expect(result.comparisonRange).toBeNull();
    expect(result.percentile).toBeNull();
    expect(result.estimatedMarketRate).toBeNull();
    expect(result.potentialAnnualSavings).toBeNull();
  });

  it("evaluates deterministic bill quality findings accurately", async () => {
    const quality = await categoryIntelligence.analyzeBill({
      totalAmount: 1000,
      subtotalAmount: 800,
      taxAmount: 100,
      currency: "USD",
      invoiceNumber: "INV-101",
    });

    expect(quality.status).toBe("bad");
    expect(
      quality.findings.some(
        (finding) => finding.code === "arithmetic_mismatch",
      ),
    ).toBe(true);
  });

  it("sanitizes customer identifiers prior to public research", () => {
    const query =
      "Check rates for account # 98412354 invoice # 4410 SSN 123-45-6789 test@company.com";
    const sanitized = sanitizeSearchQuery(query);

    expect(sanitized).not.toContain("98412354");
    expect(sanitized).not.toContain("123-45-6789");
    expect(sanitized).not.toContain("test@company.com");
    expect(sanitized).toContain("[REDACTED]");
  });

  it("normalizes line items using only the selected category pack", async () => {
    const items = [
      { description: "kWh Energy Charge", amount: 450 },
      { description: "kW Peak Demand Fee", amount: 120 },
      { description: "State Sales Tax", amount: 45 },
    ];
    const normalized = await categoryIntelligence.normalizeLineItems(
      items,
      "commercial-electricity-supply",
    );

    expect(normalized[0].chargeClass).toBe("usage");
    expect(normalized[1].chargeClass).toBe("demand");
    expect(normalized[2].chargeClass).toBe("tax");
    expect(normalized[0].confidence).toBeLessThan(0.8);
    expect(normalized[0].reviewRequired).toBe(true);
  });

  it("does not classify cross-market keywords outside the selected pack", async () => {
    const [lineItem] = await categoryIntelligence.normalizeLineItems(
      [{ description: "Access Fee", amount: 125 }],
      "saas-subscriptions",
    );

    expect(lineItem.canonicalCode).toBeNull();
    expect(lineItem.chargeClass).toBe("unknown");
    expect(lineItem.confidence).toBe(0);
    expect(lineItem.reviewRequired).toBe(true);
  });

  it("uses a dedicated draft pack for workers compensation and a neutral one for unsupported markets", () => {
    expect(hasDedicatedExpertPack("workers-compensation")).toBe(true);
    const pack = getExpertPack("workers-compensation");

    expect(pack.categoryKey).toBe("workers-compensation");
    expect(pack.status).toBe("draft");
    expect(pack.lineItems.length).toBeGreaterThan(0);
    expect(pack.benchmarkPolicy.supportedMetrics).toEqual([]);

    const unsupported = getExpertPack("unlisted-insurance-market");
    expect(unsupported.status).toBe("draft");
    expect(unsupported.lineItems).toEqual([]);
  });
});
