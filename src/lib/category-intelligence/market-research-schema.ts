import { z } from "zod";

export const TrustedSourceSchema = z.object({
  id: z.string(),
  categoryKey: z.string(),
  name: z.string(),
  url: z.string().url(),
  type: z.enum([
    "regulator",
    "government_dataset",
    "official_vendor_pricing",
    "tariff",
    "standards_body",
    "licensed_market_data",
  ]),
  authorityLevel: z.enum(["primary", "secondary", "contextual"]),
  jurisdiction: z.string(),
  updateFrequency: z.enum([
    "weekly",
    "monthly",
    "quarterly",
    "annual",
    "event_driven",
  ]),
  restrictionNotes: z.string(),
});

export const MarketResearchFactSchema = z.object({
  fact: z.string(),
  unit: z.string().nullable(),
  sourceTitle: z.string(),
  sourceUrl: z.string().url(),
  publisher: z.string(),
  asOf: z.string(),
  retrievedAt: z.string(),
  excerpt: z.string(),
  confidence: z.number().min(0).max(1),
  comparable: z.boolean(),
});

export const MarketResearchResultSchema = z.object({
  facts: z.array(MarketResearchFactSchema),
  freshness: z.enum(["fresh", "stale", "unverified"]),
  searchPerformed: z.boolean(),
});

export const MarketResearchInputSchema = z.object({
  categoryKey: z.string(),
  query: z.string(),
  jurisdiction: z.string().optional(),
  vendorName: z.string().optional(),
});
