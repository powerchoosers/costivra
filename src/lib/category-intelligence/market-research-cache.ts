import "server-only";

import { createHash } from "node:crypto";
import type { MarketResearchInput, MarketResearchResult } from "./types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CacheIdentity = {
  categoryKey: string;
  jurisdiction: string | null;
  vendorName: string | null;
  queryHash: string;
};

type CachedResearchRow = {
  result: MarketResearchResult;
  expiresAt: string;
};

const memoryCache = new Map<string, CachedResearchRow>();

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalize(value?: string): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

export function buildMarketResearchCacheIdentity(
  input: MarketResearchInput,
): CacheIdentity & { cacheKey: string } {
  const queryHash = sha256(input.query.trim().toLowerCase());
  const identity: CacheIdentity = {
    categoryKey: input.categoryKey.trim().toLowerCase(),
    jurisdiction: normalize(input.jurisdiction),
    vendorName: normalize(input.vendorName),
    queryHash,
  };

  return {
    ...identity,
    cacheKey: sha256(JSON.stringify(identity)),
  };
}

function isUsable(result: unknown): result is MarketResearchResult {
  if (!result || typeof result !== "object" || Array.isArray(result)) return false;
  const candidate = result as Partial<MarketResearchResult>;
  return (
    Array.isArray(candidate.facts) &&
    (candidate.freshness === "fresh" ||
      candidate.freshness === "stale" ||
      candidate.freshness === "unverified") &&
    typeof candidate.searchPerformed === "boolean"
  );
}

export async function readMarketResearchCache(
  input: MarketResearchInput,
): Promise<MarketResearchResult | null> {
  const { cacheKey } = buildMarketResearchCacheIdentity(input);
  const inMemory = memoryCache.get(cacheKey);
  if (inMemory && Date.parse(inMemory.expiresAt) > Date.now()) {
    return { ...inMemory.result, searchPerformed: false };
  }

  try {
    const client = createServerSupabaseClient();
    const { data, error } = await client
      .from("category_research_runs")
      .select("result, expires_at")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error || !data || !isUsable(data.result)) return null;

    const cached = { result: data.result, expiresAt: data.expires_at };
    memoryCache.set(cacheKey, cached);
    return { ...cached.result, searchPerformed: false };
  } catch {
    // A cache outage must never produce an invented current-market fact.
    return null;
  }
}

export async function writeMarketResearchCache(
  input: MarketResearchInput,
  result: MarketResearchResult,
  freshnessDays: number,
): Promise<void> {
  const identity = buildMarketResearchCacheIdentity(input);
  const expiresAt = new Date(
    Date.now() + Math.max(1, freshnessDays) * 24 * 60 * 60 * 1000,
  ).toISOString();
  const cached = { result, expiresAt };
  memoryCache.set(identity.cacheKey, cached);

  try {
    const client = createServerSupabaseClient();
    await client.from("category_research_runs").upsert(
      {
        cache_key: identity.cacheKey,
        category_key: identity.categoryKey,
        jurisdiction: identity.jurisdiction,
        vendor_name: identity.vendorName,
        query_hash: identity.queryHash,
        result,
        source_ids: result.facts.map((fact) => fact.sourceId),
        retrieved_at: new Date().toISOString(),
        expires_at: expiresAt,
      },
      { onConflict: "cache_key" },
    );
  } catch {
    // The in-memory cache remains a safe best-effort fallback for this process.
  }
}

export function clearMarketResearchMemoryCacheForTests(): void {
  memoryCache.clear();
}
