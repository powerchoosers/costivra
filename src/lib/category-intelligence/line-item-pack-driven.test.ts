import { describe, expect, it } from "vitest";
import { normalizeLineItems } from "./line-item-normalizer";

describe("Packet 04: Pack-Driven Line-Item Normalization & Isolation", () => {
  it("maps 'access fee' to broadband local loop/access when category is business-broadband-dia", () => {
    const [result] = normalizeLineItems(
      [{ description: "Dedicated Access Fee", amount: 250 }],
      "business-broadband-dia",
    );
    expect(result.canonicalCode).toBe("TELE-LOOP-01");
    expect(result.chargeClass).toBe("fixed");
    expect(result.matchedAlias).toBe("Access Fee");
  });

  it("does not map 'access fee' to telecom when category is commercial-property insurance", () => {
    const [result] = normalizeLineItems(
      [{ description: "Dedicated Access Fee", amount: 250 }],
      "commercial-property",
    );
    expect(result.canonicalCode).toBeNull();
    expect(result.chargeClass).toBe("unknown");
    expect(result.confidence).toBe(0);
    expect(result.reviewRequired).toBe(true);
  });

  it("maps 'seat' to license seat when category is saas-subscriptions", () => {
    const [result] = normalizeLineItems(
      [{ description: "Enterprise User Seat", amount: 45 }],
      "saas-subscriptions",
    );
    expect(result.canonicalCode).toBe("SAAS-SEAT-01");
    expect(result.chargeClass).toBe("fixed");
  });

  it("does not map 'seat' when category is an unsupported or vehicle category", () => {
    const [result] = normalizeLineItems(
      [{ description: "Executive Leather Seat Option", amount: 1500 }],
      "fleet-vehicle-lease",
    );
    expect(result.canonicalCode).toBeNull();
    expect(result.chargeClass).toBe("unknown");
    expect(result.confidence).toBe(0);
    expect(result.reviewRequired).toBe(true);
  });

  it("returns confidence 0 and reviewRequired true for unclassified lines", () => {
    const [result] = normalizeLineItems(
      [{ description: "XYZ Miscellaneous Surcharge", amount: 19.99 }],
      "saas-subscriptions",
    );
    expect(result.canonicalCode).toBeNull();
    expect(result.chargeClass).toBe("unknown");
    expect(result.confidence).toBe(0);
    expect(result.reviewRequired).toBe(true);
  });

  it("maps negative amount to generic credit cross-category item", () => {
    const [result] = normalizeLineItems(
      [{ description: "Overcharge Adjustment", amount: -75.0 }],
      "business-broadband-dia",
    );
    expect(result.canonicalCode).toBe("GEN-CREDIT-01");
    expect(result.chargeClass).toBe("credit");
    expect(result.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it("returns packVersion and preserves evidenceIds", () => {
    const [result] = normalizeLineItems(
      [{ description: "Monthly Software License", amount: 100, evidenceIds: ["ev-101"] }],
      "saas-subscriptions",
    );
    expect(result.packVersion).toBeDefined();
    expect(result.evidenceIds).toEqual(["ev-101"]);
  });
});
