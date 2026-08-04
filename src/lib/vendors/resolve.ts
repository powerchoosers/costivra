import "server-only";

import { normalizeVendorName, normalizeDomain, normalizeCategorySlug } from "./normalize";
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
  matchStatus: "provided" | "exact" | "catalog_exact" | "domain" | "enriched_candidate" | "ambiguous" | "unmatched";
  confidence: number;
  resolutionMethod: string;
  categoryName: string | null;
  categoryId: string | null;
  isCandidate: boolean;
  needsReview: boolean;
};

/**
 * Shared 8-step vendor and category discovery & resolution pipeline:
 * 1. Provided relationship hint
 * 2. Exact organization relationship match
 * 3. Exact global catalog name or alias match
 * 4. Document domain match
 * 5. Bounded public enrichment
 * 6. Idempotent candidate creation
 * 7. Organization relationship linking
 * 8. Review routing
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
  const normalizedDomains = domainHints.map(normalizeDomain).filter(Boolean);

  // 1. Provided relationship hint
  if (providedRelationshipId) {
    const { data: rel } = await db
      .from("organization_vendors")
      .select("id, vendor_id, vendors(name, category)")
      .eq("id", providedRelationshipId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (rel && rel.vendor_id) {
      const vendorData = rel.vendors as unknown as { name?: string; category?: string } | null;
      return {
        vendorId: rel.vendor_id,
        organizationVendorId: rel.id,
        matchStatus: "provided",
        confidence: 1.0,
        resolutionMethod: "provided_relationship_hint",
        categoryName: vendorData?.category ?? categoryHint ?? null,
        categoryId: null,
        isCandidate: false,
        needsReview: false,
      };
    }
  }

  // 2. Exact organization relationship match
  if (normalizedExtractedName) {
    const { data: orgVendors } = await db
      .from("organization_vendors")
      .select("id, vendor_id, vendors(id, name, normalized_name, category)")
      .eq("organization_id", organizationId);

    if (orgVendors && orgVendors.length > 0) {
      for (const ov of orgVendors) {
        const v = ov.vendors as unknown as { id: string; name: string; normalized_name?: string; category?: string } | null;
        if (v && (normalizeVendorName(v.name) === normalizedExtractedName || (v.normalized_name && normalizeVendorName(v.normalized_name) === normalizedExtractedName))) {
          return {
            vendorId: v.id,
            organizationVendorId: ov.id,
            matchStatus: "exact",
            confidence: 0.98,
            resolutionMethod: "organization_exact_name_match",
            categoryName: v.category ?? categoryHint ?? null,
            categoryId: null,
            isCandidate: false,
            needsReview: false,
          };
        }
      }
    }
  }

  // 3. Exact global catalog name or alias match
  if (normalizedExtractedName) {
    const { data: catalogVendors } = await db
      .from("vendors")
      .select("id, name, normalized_name, category, catalog_status")
      .or(`name.ilike.${extractedName},normalized_name.eq.${normalizedExtractedName}`)
      .limit(5);

    if (catalogVendors && catalogVendors.length === 1) {
      const v = catalogVendors[0];
      const orgRelId = await ensureOrganizationRelationship(db, organizationId, v.id);
      return {
        vendorId: v.id,
        organizationVendorId: orgRelId,
        matchStatus: "catalog_exact",
        confidence: 0.92,
        resolutionMethod: "catalog_exact_name_match",
        categoryName: v.category ?? categoryHint ?? null,
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
      .select("vendor_id, domain, vendors(id, name, category, catalog_status)")
      .in("normalized_domain", normalizedDomains)
      .limit(5);

    if (domainMatches && domainMatches.length === 1) {
      const v = (domainMatches[0] as unknown as { vendors: { id: string; name: string; category?: string; catalog_status: string } }).vendors;
      if (v) {
        const orgRelId = await ensureOrganizationRelationship(db, organizationId, v.id);
        return {
          vendorId: v.id,
          organizationVendorId: orgRelId,
          matchStatus: "domain",
          confidence: 0.90,
          resolutionMethod: "domain_exact_match",
          categoryName: v.category ?? categoryHint ?? null,
          categoryId: null,
          isCandidate: v.catalog_status === "candidate",
          needsReview: v.catalog_status === "candidate",
        };
      }
    }
  }

  // 5. Bounded public enrichment
  let enrichmentCandidate: VendorEnrichmentCandidate | null = null;
  if (normalizedExtractedName) {
    const provider = new OpenRouterVendorEnrichmentProvider();
    const candidates = await provider.search({
      extractedName,
      domainHints: normalizedDomains,
      categoryHint,
    });
    if (candidates.length > 0) {
      enrichmentCandidate = candidates[0];
    }
  }

  // 6. Candidate policy check & creation
  const policy = validateVendorCandidatePolicy(extractedName);
  if (!policy.allowed) {
    return {
      vendorId: null,
      organizationVendorId: null,
      matchStatus: "unmatched",
      confidence: 0,
      resolutionMethod: "failed_policy_check",
      categoryName: categoryHint ?? null,
      categoryId: null,
      isCandidate: false,
      needsReview: true,
    };
  }

  const targetName = enrichmentCandidate?.canonicalName || policy.cleanName;
  const targetCategory = enrichmentCandidate?.categoryName || categoryHint || "Other";
  const targetDomains = enrichmentCandidate?.domains || normalizedDomains;

  // Insert or fetch category candidate
  const categoryId = await ensureCategoryCandidate(db, targetCategory);

  // Insert or fetch vendor candidate
  const { data: existingVendor } = await db
    .from("vendors")
    .select("id, catalog_status")
    .eq("name", targetName)
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
        name: targetName,
        normalized_name: normalizeVendorName(targetName),
        category: targetCategory,
        category_id: categoryId,
        catalog_status: "candidate",
        created_source: enrichmentCandidate ? "internet_enrichment" : "document",
        source_confidence: enrichmentCandidate?.confidence ?? 0.7,
      })
      .select("id")
      .single();

    if (vError || !newVendor) {
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

    // Save domain mapping
    if (targetDomains.length > 0) {
      await db.from("vendor_domains").insert(
        targetDomains.map((dom, idx) => ({
          vendor_id: vendorId,
          domain: dom,
          normalized_domain: dom,
          is_primary: idx === 0,
          status: "candidate",
          source: "enrichment",
        })),
      );
    }
  }

  // 7. Ensure Organization Relationship
  const orgRelId = await ensureOrganizationRelationship(db, organizationId, vendorId);

  // Record enrichment run provenance if available
  if (enrichmentCandidate) {
    await db.from("vendor_enrichment_runs").insert({
      organization_id: organizationId,
      document_id: documentId,
      invoice_id: invoiceId,
      extracted_vendor_name: extractedName,
      query_fingerprint: `${normalizeVendorName(extractedName)}:${normalizedDomains[0] || ""}`,
      provider: "openrouter_search",
      status: "completed",
      candidate_vendor_id: vendorId,
      candidate_category_id: categoryId,
      confidence: enrichmentCandidate.confidence,
      public_evidence: enrichmentCandidate.sources,
    });
  }

  return {
    vendorId,
    organizationVendorId: orgRelId,
    matchStatus: "enriched_candidate",
    confidence: enrichmentCandidate?.confidence ?? 0.75,
    resolutionMethod: enrichmentCandidate ? "public_enrichment_candidate" : "document_extracted_candidate",
    categoryName: targetCategory,
    categoryId,
    isCandidate,
    needsReview: true, // Candidates always require review
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
