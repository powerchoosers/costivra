import { describe, expect, it } from "vitest";
import {
  performMarketResearch,
  sanitizeSearchQuery,
} from "./current-market-research";
import {
  MarketResearchResultSchema,
  TrustedSourceSchema,
} from "./market-research-schema";
import { TRUSTED_SOURCES_REGISTRY } from "./source-registry";

describe("Packet 06: Current-Market Research & Trusted Source Registry", () => {
  it("sanitizes private customer data from public search queries", () => {
    const raw =
      "Check USF contribution factor for Account #123456789 with SSN 123-45-6789 and Card 4111-2222-3333-4444 email john@example.com";
    const sanitized = sanitizeSearchQuery(raw);
    expect(sanitized).not.toContain("123-45-6789");
    expect(sanitized).not.toContain("4111-2222-3333-4444");
    expect(sanitized).not.toContain("john@example.com");
    expect(sanitized).not.toContain("123456789");
    expect(sanitized).toContain("[SSN-REDACTED]");
    expect(sanitized).toContain("[CARD-REDACTED]");
    expect(sanitized).toContain("[EMAIL-REDACTED]");
  });

  it("validates trusted source registry schemas", () => {
    expect(TRUSTED_SOURCES_REGISTRY.length).toBeGreaterThan(10);
    for (const source of TRUSTED_SOURCES_REGISTRY) {
      const parsed = TrustedSourceSchema.safeParse(source);
      expect(parsed.success).toBe(true);
    }
  });

  it("returns unverified result when API key or category sources are absent", async () => {
    const result = await performMarketResearch({
      categoryKey: "unknown-category-without-sources",
      query: "current market rates",
    });
    expect(result.facts).toEqual([]);
    expect(result.freshness).toBe("unverified");
    expect(result.searchPerformed).toBe(false);
    expect(MarketResearchResultSchema.safeParse(result).success).toBe(true);
  });
});
