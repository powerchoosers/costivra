import { NextResponse } from "next/server";
import {
  companyLookupFromWebsite,
  enrichApolloOrganization,
  isApolloConfigured,
} from "@/lib/integrations/apollo";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanUuid } from "@/lib/portal/http";

export const runtime = "nodejs";

const CACHE_MS = 30 * 24 * 60 * 60 * 1_000;

const providerOutcome = {
  no_match: { status: 404, error: "Apollo could not match that company website." },
  rate_limited: { status: 429, error: "Apollo is rate-limiting company lookups. Try again later." },
  forbidden: { status: 503, error: "The Apollo key does not have access to company enrichment." },
  invalid: { status: 422, error: "Apollo could not use that company website for enrichment." },
  unavailable: { status: 503, error: "Apollo is unavailable right now. Try again later." },
} as const;

function currentEnough(status: unknown, fetchedAt: unknown, lookupDomain: unknown, expectedDomain: string) {
  const timestamp = typeof fetchedAt === "string" ? Date.parse(fetchedAt) : NaN;
  return (
    status === "fresh" &&
    lookupDomain === expectedDomain &&
    Number.isFinite(timestamp) &&
    Date.now() - timestamp < CACHE_MS
  );
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const operator = await requireInternalOperator();
    const organizationId = cleanUuid((await params).id);
    if (!organizationId)
      return NextResponse.json({ error: "Choose a valid account." }, { status: 400 });

    const [{ data: organization, error: organizationError }, { data: profile, error: profileError }, { data: existing, error: existingError }] = await Promise.all([
      operator.db.from("organizations").select("id").eq("id", organizationId).maybeSingle(),
      operator.db.from("crm_account_profiles").select("website").eq("organization_id", organizationId).maybeSingle(),
      operator.db.from("crm_account_enrichments").select("status,fetched_at,lookup_domain").eq("organization_id", organizationId).maybeSingle(),
    ]);
    if (organizationError || profileError || existingError)
      throw organizationError || profileError || existingError;
    if (!organization)
      return NextResponse.json({ error: "That account was not found." }, { status: 404 });
    const lookup = companyLookupFromWebsite(profile?.website);
    if (!lookup)
      return NextResponse.json(
        { error: "Add a public account website before refreshing its company profile." },
        { status: 409 },
      );
    if (currentEnough(existing?.status, existing?.fetched_at, existing?.lookup_domain, lookup.domain))
      return NextResponse.json({ ok: true, cached: true });
    if (!isApolloConfigured())
      return NextResponse.json(
        { error: "Apollo company enrichment is not configured." },
        { status: 503 },
      );

    const { error: requestAuditError } = await operator.db.from("internal_audit_events").insert({
      actor_id: operator.userId,
      organization_id: organizationId,
      action: "crm.account_apollo_enrichment_requested",
      resource_type: "organization",
      resource_id: organizationId,
      safe_metadata: {
        provider: "apollo",
        match_method: lookup.matchMethod,
        cached: false,
      },
    });
    if (requestAuditError) throw requestAuditError;

    const { data: claimed, error: claimError } = await operator.db.rpc(
      "claim_internal_crm_account_enrichment",
      { p_organization_id: organizationId },
    );
    if (claimError) throw claimError;
    if (claimed !== true)
      return NextResponse.json(
        { error: "A recent refresh is already being processed. Try again in a moment." },
        { status: 409 },
      );

    const result = await enrichApolloOrganization(lookup);
    const now = new Date().toISOString();
    if (result.status === "fresh") {
      const { error } = await operator.db.from("crm_account_enrichments").upsert({
        organization_id: organizationId,
        provider: "apollo",
        provider_organization_id: result.providerOrganizationId,
        match_method: lookup.matchMethod,
        lookup_domain: lookup.domain,
        short_description: result.shortDescription,
        industry: result.industry,
        website: result.website,
        linkedin_url: result.linkedinUrl,
        location: result.location,
        employee_count: result.employeeCount,
        founded_year: result.foundedYear,
        status: "fresh",
        response_hash: result.responseHash,
        last_error_code: null,
        fetched_at: now,
        attempted_at: now,
        updated_at: now,
      }, { onConflict: "organization_id" });
      if (error) throw error;
    } else {
      const { error } = await operator.db.from("crm_account_enrichments").update({
        status: result.status,
        last_error_code: result.status,
        response_hash: result.responseHash,
        attempted_at: now,
        updated_at: now,
      }).eq("organization_id", organizationId);
      if (error) throw error;
    }
    const { error: auditError } = await operator.db.from("internal_audit_events").insert({
      actor_id: operator.userId,
      organization_id: organizationId,
      action: "crm.account_apollo_enrichment_completed",
      resource_type: "organization",
      resource_id: organizationId,
      safe_metadata: {
        provider: "apollo",
        match_method: lookup.matchMethod,
        outcome: result.status,
        cached: false,
        snapshot_received: Boolean(result.responseHash),
      },
    });
    if (auditError) throw auditError;
    if (result.status !== "fresh") {
      const outcome = providerOutcome[result.status];
      return NextResponse.json(
        { ok: false, cached: false, status: result.status, error: outcome.error },
        { status: outcome.status },
      );
    }
    return NextResponse.json({ ok: true, cached: false, status: "fresh" });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
