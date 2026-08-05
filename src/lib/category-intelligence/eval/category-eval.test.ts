import { describe, expect, it } from "vitest";
import { categoryIntelligence } from "../service";
import { evaluateMarketBenchmark } from "../benchmark-engine";
import { sanitizeSearchQuery } from "../current-market-research";

describe("Category Intelligence Layer Verification", () => {
  it("resolves canonical categories correctly from vendor and line item text", async () => {
    const resEnergy = await categoryIntelligence.resolveCategory({
      vendorName: "TXU Energy",
      lineItemDescriptions: ["kWh Generation Charge", "kW Peak Demand"],
    });
    expect(resEnergy.key).toBe("commercial-electricity-supply");
    expect(resEnergy.parentKey).toBe("energy-utilities");

    const resInsurance = await categoryIntelligence.resolveCategory({
      vendorName: "Hartford Commercial",
      lineItemDescriptions: ["Workers Comp Class Code 8810", "Experience Mod 0.92"],
    });
    expect(resInsurance.key).toBe("workers-compensation");
    expect(resInsurance.parentKey).toBe("insurance-benefits");
  });

  it("returns insufficient_data when required dimensions are absent and does not use hardcoded ratios", () => {
    const result = evaluateMarketBenchmark({
      categoryKey: "commercial-electricity-supply",
      metric: "effective_rate",
      billedAmount: 1500,
      // Missing geography.state and volume
    });

    expect(result.status).toBe("insufficient_data");
    expect(result.estimatedMarketRate).toBeNull();
    expect(result.potentialAnnualSavings).toBeNull();
    expect(result.missingDimensions.length).toBeGreaterThan(0);
    expect(result.caveats.some((c) => c.includes("synthetic"))).toBe(true);
  });

  it("evaluates deterministic bill quality findings accurately", async () => {
    const quality = await categoryIntelligence.analyzeBill({
      totalAmount: 1000,
      subtotalAmount: 800,
      taxAmount: 100, // 800 + 100 = 900 != 1000 => arithmetic mismatch!
      currency: "USD",
      invoiceNumber: "INV-101",
    });

    expect(quality.status).toBe("bad");
    expect(quality.findings.some((f) => f.code === "arithmetic_mismatch")).toBe(true);
  });

  it("sanitizes customer PII prior to any public market research", () => {
    const query = "Check rates for John Doe account # 98412354 invoice # 4410 SSN 123-45-6789 test@company.com";
    const sanitized = sanitizeSearchQuery(query);

    expect(sanitized).not.toContain("98412354");
    expect(sanitized).not.toContain("123-45-6789");
    expect(sanitized).not.toContain("test@company.com");
    expect(sanitized).toContain("[REDACTED]");
  });

  it("normalizes line items into canonical codes and charge classes", async () => {
    const items = [
      { description: "kWh Energy Charge", amount: 450 },
      { description: "kW Peak Demand Fee", amount: 120 },
      { description: "State Sales Tax", amount: 45 },
    ];
    const normalized = await categoryIntelligence.normalizeLineItems(items, "commercial-electricity-supply");

    expect(normalized[0].chargeClass).toBe("usage");
    expect(normalized[1].chargeClass).toBe("demand");
    expect(normalized[2].chargeClass).toBe("tax");
  });
});
