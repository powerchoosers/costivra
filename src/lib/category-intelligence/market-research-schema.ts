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
  freshnessDays: z.number().int().positive(),
  accessType: z.enum(["public_web", "licensed", "customer_provided"]),
  lastVerifiedAt: z.string().date(),
  nextReviewAt: z.string().date(),
  licenseNotes: z.string(),
  allowedUses: z.array(z.enum(["research", "context", "benchmark_validation"])),
  status: z.enum(["active", "review_required", "deprecated"]),
  restrictionNotes: z.string(),
});

export const MarketResearchFactSchema = z.object({
  fact: z.string(),
  unit: z.string().nullable(),
  scope: z.record(z.string(), z.string()),
  sourceId: z.string(),
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
