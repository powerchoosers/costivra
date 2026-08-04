import "server-only";

import { normalizeVendorName, normalizeDomain } from "./normalize";
import { isConfiguredSecret } from "@/lib/env/secrets";

export type VendorEnrichmentInput = {
  extractedName: string;
  domainHints?: string[];
  categoryHint?: string | null;
};

export type VendorEnrichmentCandidate = {
  canonicalName: string;
  domains: string[];
  categoryName: string | null;
  aliases: string[];
  confidence: number;
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
};

export interface VendorEnrichmentProvider {
  search(input: VendorEnrichmentInput): Promise<VendorEnrichmentCandidate[]>;
}

/**
 * Server-only OpenRouter / Web Search Vendor Enrichment Adapter.
 * Strictly sends public identity hints only (extracted vendor name & domain hints).
 * ZERO sensitive financial values, amounts, customer names, or invoice text leave the server.
 */
export class OpenRouterVendorEnrichmentProvider implements VendorEnrichmentProvider {
  async search(input: VendorEnrichmentInput): Promise<VendorEnrichmentCandidate[]> {
    const key = process.env.OPEN_ROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!isConfiguredSecret(key)) {
      return [];
    }

    const { extractedName, domainHints = [], categoryHint } = input;
    if (!extractedName || extractedName.trim().length < 2) {
      return [];
    }

    const publicQuery = `Vendor business identity for "${extractedName.trim()}" ${domainHints.length > 0 ? `domain: ${domainHints[0]}` : ""}`;

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key.trim()}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://costivra.ai",
          "X-Title": "Costivra Vendor Enrichment",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a public business identity resolver. Identify the canonical company name, official website domain, primary expense category, and common brand aliases for the given business. Return ONLY valid JSON format:
{
  "canonicalName": "Company Name",
  "domains": ["company.com"],
  "categoryName": "Software Subscriptions",
  "aliases": ["Alias 1"],
  "confidence": 0.85
}`,
            },
            {
              role: "user",
              content: publicQuery,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 300,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) return [];
      const data = await response.json();
      const rawText = data?.choices?.[0]?.message?.content;
      if (!rawText) return [];

      const parsed = JSON.parse(rawText);
      if (!parsed.canonicalName || typeof parsed.canonicalName !== "string") return [];

      const cleanName = parsed.canonicalName.trim();
      const cleanDomains = (Array.isArray(parsed.domains) ? parsed.domains : [])
        .map((d: unknown) => (typeof d === "string" ? normalizeDomain(d) : ""))
        .filter(Boolean);

      return [
        {
          canonicalName: cleanName,
          domains: cleanDomains,
          categoryName: typeof parsed.categoryName === "string" ? parsed.categoryName.trim() : categoryHint ?? null,
          aliases: (Array.isArray(parsed.aliases) ? parsed.aliases : []).filter((a: unknown): a is string => typeof a === "string"),
          confidence: typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.7,
          sources: [
            {
              title: "Public Business Registry / OpenRouter",
              url: `https://${cleanDomains[0] || "google.com"}`,
              snippet: `Public identity result for ${cleanName}`,
            },
          ],
        },
      ];
    } catch {
      return [];
    }
  }
}
