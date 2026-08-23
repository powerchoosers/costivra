import "server-only";

import { normalizeVendorName, normalizeDomain, normalizeCategorySlug, resolveKnownVendorIdentity } from "./normalize";
import { validateVendorCandidatePolicy } from "./candidate-policy";
import { OpenRouterVendorEnrichmentProvider, type VendorEnrichmentCandidate } from "./enrichment-provider";
import type { SupabaseClient } from "@supabase/supabase-js";

export type VendorResolutionInput = {
  db: SupabaseClient;
  organizationId: string;
  extractedName: string;
  providedRelationshipId?: string | null;
  domainHints?: string[];
  categoryHint?: string | null;
  documentId?: string | null;
  invoiceId?: string | null;
};

export type VendorResolutionResult = {
  vendorId: string | null;
  organizationVendorId: string | null;
  matchStatus:
    | "provided"
    | "exact"
    | "catalog_exact"
    | "domain"
    | "enriched_candidate"
    | "ambiguous"
    | "unmatched";
  confidence: number;
  resolutionMethod: string;
  categoryName: string | null;
  categoryId: string | null;
  isCandidate: boolean;
  needsReview: boolean;
};

/** Expanded blocked vendor name set — never create global candidates from these. */
const BLOCKED_VENDOR_NAMES = new Set([
  "unknown",
  "unknown vendor",
  "not available",
  "n/a",
  "na",
  "none",
  "unidentified",
  "unrecognized vendor",
  "invoice vendor",
  "vendor",
  "invoice",
  "statement",
]);

function isBlockedVendorName(normalized: string): boolean {
  return BLOCKED_VENDOR_NAMES.has(normalized.toLowerCase().trim());
}

/**
 * Shared 8-step vendor and category discovery & resolution pipeline.
 * Uses vendors.canonical_name throughout — no vendors.name column exists.
 *
 * Resolution order:
 *   1. Provided relationship hint
 *   2. Exact organization relationship match (canonical_name / normalized_name / aliases)
 *   3. Exact global catalog match (canonical_name / normalized_name / aliases)
 *   4. Domain match via vendor_domains
 *   5. Bounded public enrichment (only public-safe identity hints sent)
 *   6. Candidate policy check
 *   7. Atomic candidate / category / domain creation
 *   8. Organization relationship creation or reuse
 */
export async function resolveVendorAndCategory(
  input: VendorResolutionInput,
): Promise<VendorResolutionResult> {
  const {
    db,
    organizationId,
    extractedName,
    providedRelationshipId,
    domainHints = [],
    categoryHint,
    documentId,
    invoiceId,
  } = input;

  const normalizedExtractedName = normalizeVendorName(extractedName);
  const knownIdentity = resolveKnownVendorIdentity(extractedName);
  const normalizedMatchName = normalizeVendorName(knownIdentity?.canonicalName ?? extractedName);
  const resolvedCategoryHint = knownIdentity?.categoryName ?? categoryHint;
  const normalizedDomains = domainHints
    .map(normalizeDomain)
    .filter((d): d is string => Boolean(d));

  // Early exit: blocked or missing vendor name
  if (!normalizedExtractedName || isBlockedVendorName(normalizedExtractedName)) {
    return {
      vendorId: null,
      organizationVendorId: null,
      matchStatus: "unmatched",
      confidence: 0,
      resolutionMethod: "blocked_or_missing_vendor_name",
      categoryName: resolvedCategoryHint ?? null,
      categoryId: null,
      isCandidate: false,
      needsReview: true,
    };
  }

  // 1. Provided relationship hint
  if (providedRelationshipId) {
    const { data: rel } = await db
      .from("organization_vendors")
      .select("id, vendor_id, vendors(id, canonical_name, category)")
      .eq("id", providedRelationshipId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (rel && rel.vendor_id) {
      const vData = rel.vendors as unknown as {
        id?: string;
        canonical_name?: string;
        category?: string | null;
      } | null;
      if (knownIdentity || resolvedCategoryHint) {
        await updateKnownRelationshipLabels(db, organizationId, rel.id, knownIdentity, resolvedCategoryHint);
      }
      return {
        vendorId: rel.vendor_id,
        organizationVendorId: rel.id,
        matchStatus: "provided",
        confidence: 1.0,
        resolutionMethod: "provided_relationship_hint",
        categoryName: resolvedCategoryHint ?? vData?.category ?? null,
        categoryId: null,
        isCandidate: false,
        needsReview: false,
      };
    }
  }

  // 2. Exact organization relationship match
  {
    const { data: orgVendors } = await db
      .from("organization_vendors")
      .select("id, vendor_id, vendors(id, canonical_name, normalized_name, category, search_aliases)")
      .eq("organization_id", organizationId);

    if (orgVendors && orgVendors.length > 0) {
      for (const ov of orgVendors) {
        const v = ov.vendors as unknown as {
          id: string;
          canonical_name?: string;
          normalized_name?: string;
          category?: string | null;
          search_aliases?: string[] | null;
        } | null;
        if (!v) continue;

        const normalizedCanonical = normalizeVendorName(v.canonical_name ?? "");
        const knownCanonical = resolveKnownVendorIdentity(v.canonical_name ?? "");
        const normalizedNorm = v.normalized_name ? normalizeVendorName(v.normalized_name) : null;
        const aliasMatch = (v.search_aliases ?? []).some(
          (a) => normalizeVendorName(a) === normalizedMatchName,
        );

        if (
          normalizedCanonical === normalizedMatchName ||
          (knownCanonical && normalizeVendorName(knownCanonical.canonicalName) === normalizedMatchName) ||
          (normalizedNorm && normalizedNorm === normalizedMatchName) ||
          aliasMatch
        ) {
          if (knownIdentity || resolvedCategoryHint) {
            await updateKnownRelationshipLabels(db, organizationId, ov.id, knownIdentity, resolvedCategoryHint);
          }
          return {
            vendorId: v.id,
            organizationVendorId: ov.id,
            matchStatus: "exact",
            confidence: 0.98,
            resolutionMethod: "organization_exact_name_match",
            categoryName: resolvedCategoryHint ?? v.category ?? null,
            categoryId: null,
            isCandidate: false,
            needsReview: false,
          };
        }
      }
    }
  }

  // 3. Exact global catalog match — select only canonical_name (no name column)
  {
    const { data: catalogVendors } = await db
      .from("vendors")
      .select("id, canonical_name, normalized_name, category, catalog_status, search_aliases")
      .or(
        `canonical_name.ilike.${extractedName},normalized_name.eq.${normalizedExtractedName},normalized_name.eq.${normalizedMatchName}`,
      )
      .limit(5);

    // Also check alias array for the catalog
    const catalogMatch = (catalogVendors ?? []).find(
      (v) =>
        normalizeVendorName(v.canonical_name) === normalizedMatchName ||
        (resolveKnownVendorIdentity(v.canonical_name)?.canonicalName && normalizeVendorName(resolveKnownVendorIdentity(v.canonical_name)!.canonicalName) === normalizedMatchName) ||
        (v.normalized_name && normalizeVendorName(v.normalized_name) === normalizedMatchName) ||
        ((v.search_aliases as string[] | null) ?? []).some(
          (a) => normalizeVendorName(a) === normalizedMatchName,
        ),
    );

    if (catalogMatch && catalogVendors && catalogVendors.length <= 2) {
      const v = catalogMatch;
      const orgRelId = await ensureOrganizationRelationship(db, organizationId, v.id);
      return {
        vendorId: v.id,
        organizationVendorId: orgRelId,
        matchStatus: "catalog_exact",
        confidence: 0.92,
        resolutionMethod: "catalog_exact_name_match",
        categoryName: resolvedCategoryHint ?? v.category ?? null,
        categoryId: null,
        isCandidate: v.catalog_status === "candidate",
        needsReview: v.catalog_status === "candidate",
      };
    }
  }

  // 4. Document domain match
  if (normalizedDomains.length > 0) {
    const { data: domainMatches } = await db
      .from("vendor_domains")
      .select(
        "vendor_id, domain, vendors(id, canonical_name, category, catalog_status)",
      )
      .in("normalized_domain", normalizedDomains)
      .limit(5);

    if (domainMatches && domainMatches.length === 1) {
      const v = (
        domainMatches[0] as unknown as {
          vendors: {
            id: string;
            canonical_name?: string;
            category?: string | null;
            catalog_status: string;
          };
        }
      ).vendors;
      if (v) {
        const orgRelId = await ensureOrganizationRelationship(db, organizationId, v.id);
        return {
          vendorId: v.id,
          organizationVendorId: orgRelId,
          matchStatus: "domain",
          confidence: 0.9,
          resolutionMethod: "domain_exact_match",
          categoryName: resolvedCategoryHint ?? v.category ?? null,
          categoryId: null,
          isCandidate: v.catalog_status === "candidate",
          needsReview: v.catalog_status === "candidate",
        };
      }
    }
  }

  // 5. Bounded public enrichment (only public-safe identity hints sent — no financials)
  let enrichmentCandidate: VendorEnrichmentCandidate | null = null;
  {
    const provider = new OpenRouterVendorEnrichmentProvider();
    const candidates = await provider.search({
      extractedName,
      domainHints: normalizedDomains,
      categoryHint: resolvedCategoryHint,
    });
    if (candidates.length > 0) {
      enrichmentCandidate = candidates[0] ?? null;
    }
  }

  // 6. Candidate policy check
  const policy = validateVendorCandidatePolicy(extractedName);
  if (!policy.allowed) {
    return {
      vendorId: null,
      organizationVendorId: null,
      matchStatus: "unmatched",
      confidence: 0,
      resolutionMethod: "failed_policy_check",
      categoryName: resolvedCategoryHint ?? null,
      categoryId: null,
      isCandidate: false,
      needsReview: true,
    };
  }

  // Known identities are already bounded by the deterministic identity map, so
  // they must not depend on an optional enrichment provider being available.
  // Unknown names still require a sufficiently confident, source-backed result.
  const enrichmentConfidence = enrichmentCandidate?.confidence ?? 0;
  const hasRealSources = (enrichmentCandidate?.sources ?? []).some(
    (s) => s.url && !s.url.includes("google.com") && s.url.startsWith("https://"),
  );

  if (!knownIdentity && (enrichmentConfidence < 0.70 || !enrichmentCandidate)) {
    // No enrichment or below threshold — remain unmatched
    return {
      vendorId: null,
      organizationVendorId: null,
      matchStatus: "unmatched",
      confidence: enrichmentConfidence,
      resolutionMethod: "enrichment_below_threshold",
      categoryName: resolvedCategoryHint ?? null,
      categoryId: null,
      isCandidate: false,
      needsReview: true,
    };
  }

  // 7. Atomic candidate creation
  const targetName = knownIdentity?.canonicalName || enrichmentCandidate?.canonicalName || policy.cleanName;
  const targetCategory = knownIdentity?.categoryName || enrichmentCandidate?.categoryName || resolvedCategoryHint || "Other";
  const targetNormalized = normalizeVendorName(targetName);
  const targetDomains = (enrichmentCandidate?.domains.length ?? 0) > 0
    ? enrichmentCandidate!.domains
    : normalizedDomains;

  if (isBlockedVendorName(targetNormalized)) {
    return {
      vendorId: null,
      organizationVendorId: null,
      matchStatus: "unmatched",
      confidence: 0,
      resolutionMethod: "enrichment_resolved_to_blocked_name",
      categoryName: resolvedCategoryHint ?? null,
      categoryId: null,
      isCandidate: false,
      needsReview: true,
    };
  }

  // Insert or fetch category candidate
  const categoryId = await ensureCategoryCandidate(db, targetCategory);

  // Insert or fetch vendor — use canonical_name only, no name column
  const { data: existingVendor } = await db
    .from("vendors")
    .select("id, catalog_status")
    .or(`canonical_name.eq.${targetName},normalized_name.eq.${targetNormalized}`)
    .maybeSingle();

  let vendorId: string;
  let isCandidate = true;

  if (existingVendor) {
    vendorId = existingVendor.id;
    isCandidate = existingVendor.catalog_status === "candidate";
  } else {
    const { data: newVendor, error: vError } = await db
      .from("vendors")
      .insert({
        canonical_name: targetName,           // correct field, no "name" column
        normalized_name: targetNormalized,
        category: targetCategory,
        category_id: categoryId,
        catalog_status: "candidate",
        created_source: enrichmentConfidence >= 0.85 && hasRealSources
          ? "internet_enrichment"
          : "document",
        source_confidence: enrichmentConfidence,
      })
      .select("id")
      .single();

    if (vError || !newVendor) {
      console.error("[resolve] Vendor candidate creation failed:", vError);
      return {
        vendorId: null,
        organizationVendorId: null,
        matchStatus: "unmatched",
        confidence: 0,
        resolutionMethod: "vendor_candidate_creation_failed",
        categoryName: targetCategory,
        categoryId,
        isCandidate: false,
        needsReview: true,
      };
    }
    vendorId = newVendor.id;

    // Save validated domain mappings — only domains that appeared in enrichment evidence
    if (targetDomains.length > 0) {
      await db.from("vendor_domains").insert(
        targetDomains.slice(0, 3).map((dom, idx) => ({
          vendor_id: vendorId,
          domain: dom,
          normalized_domain: dom,
          is_primary: idx === 0,
          status: "candidate",
          source: "enrichment",
          confidence: enrichmentConfidence,
        })),
      );
    }
  }

  // 8. Ensure organization relationship
  const orgRelId = await ensureOrganizationRelationship(db, organizationId, vendorId);

  // Record enrichment run provenance — public_evidence contains real retrieved sources
  await db.from("vendor_enrichment_runs").insert({
    organization_id: organizationId,
    document_id: documentId ?? null,
    invoice_id: invoiceId ?? null,
    extracted_vendor_name: extractedName,
    query_fingerprint: `${targetNormalized}:${normalizedDomains[0] ?? ""}`,
    provider: "openrouter_search",
    status: "completed",
    candidate_vendor_id: vendorId,
    candidate_category_id: categoryId,
    confidence: enrichmentConfidence,
    public_evidence: (enrichmentCandidate?.sources ?? []).map((s) => ({
      url: s.url,
      title: s.title,
      snippet: s.snippet,
      retrievedAt: new Date().toISOString(),
      engine: "openrouter_search",
    })),
    completed_at: new Date().toISOString(),
  });

  return {
    vendorId,
    organizationVendorId: orgRelId,
    matchStatus: "enriched_candidate",
    confidence: enrichmentConfidence,
    resolutionMethod:
      enrichmentConfidence >= 0.85 && hasRealSources
        ? "public_enrichment_candidate"
        : "document_extracted_candidate",
    categoryName: targetCategory,
    categoryId,
    isCandidate,
    needsReview: true, // Candidates always require human review
  };
}

async function ensureOrganizationRelationship(
  db: SupabaseClient,
  organizationId: string,
  vendorId: string,
): Promise<string> {
  const { data: existing } = await db
    .from("organization_vendors")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: inserted } = await db
    .from("organization_vendors")
    .insert({
      organization_id: organizationId,
      vendor_id: vendorId,
      relationship_status: "active",
    })
    .select("id")
    .single();

  return inserted?.id ?? "";
}

async function updateKnownRelationshipLabels(
  db: SupabaseClient,
  organizationId: string,
  relationshipId: string,
  knownIdentity: { canonicalName: string; categoryName: string } | null,
  categoryHint: string | null | undefined,
): Promise<void> {
  const updates = {
    ...(knownIdentity ? { display_name_override: knownIdentity.canonicalName } : {}),
    ...(categoryHint ? { category_override: categoryHint } : {}),
  };
  if (Object.keys(updates).length === 0) return;

  await db
    .from("organization_vendors")
    .update(updates)
    .eq("id", relationshipId)
    .eq("organization_id", organizationId);
}

async function ensureCategoryCandidate(
  db: SupabaseClient,
  categoryName: string,
): Promise<string | null> {
  const slug = normalizeCategorySlug(categoryName);
  const { data: existing } = await db
    .from("vendor_categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: inserted } = await db
    .from("vendor_categories")
    .insert({
      name: categoryName.trim(),
      slug,
      status: "candidate",
      created_source: "document",
    })
    .select("id")
    .single();

  return inserted?.id ?? null;
}
