import { describe, expect, it } from "vitest";
import {
  performMarketResearch,
  sanitizeSearchQuery,
} from "./current-market-research";
import {
  buildMarketResearchCacheIdentity,
  clearMarketResearchMemoryCacheForTests,
  readMarketResearchCache,
  writeMarketResearchCache,
} from "./market-research-cache";
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

  it("uses a fresh cache entry for the same public-safe research dimensions", async () => {
    const input = {
      categoryKey: "business-broadband-dia",
      jurisdiction: "US-TX",
      vendorName: "Example Carrier",
      query: "current USF contribution factor",
    };
    clearMarketResearchMemoryCacheForTests();

    await writeMarketResearchCache(
      input,
      {
        facts: [
          {
            fact: "A cited contribution factor is available from the primary source.",
            unit: null,
            scope: { categoryKey: "business-broadband-dia", jurisdiction: "US-TX" },
            sourceId: "src-usac-usf",
            sourceTitle: "USAC contribution factors",
            sourceUrl: "https://www.usac.org/service-providers/making-payments/contribution-factors/",
            publisher: "usac.org",
            asOf: "2026-08-05",
            retrievedAt: "2026-08-05T00:00:00.000Z",
            excerpt: "Primary source excerpt.",
            confidence: 0.85,
            comparable: false,
          },
        ],
        freshness: "fresh",
        searchPerformed: true,
      },
      1,
    );

    const cached = await readMarketResearchCache(input);
    expect(cached?.facts[0]?.sourceId).toBe("src-usac-usf");
    expect(cached?.searchPerformed).toBe(false);
  });

  it("changes the cache key when a public research dimension changes", () => {
    const base = buildMarketResearchCacheIdentity({
      categoryKey: "business-broadband-dia",
      jurisdiction: "US-TX",
      vendorName: "Example Carrier",
      query: "current USF contribution factor",
    });
    const differentJurisdiction = buildMarketResearchCacheIdentity({
      categoryKey: "business-broadband-dia",
      jurisdiction: "US-CA",
      vendorName: "Example Carrier",
      query: "current USF contribution factor",
    });

    expect(base.cacheKey).not.toBe(differentJurisdiction.cacheKey);
  });
});
