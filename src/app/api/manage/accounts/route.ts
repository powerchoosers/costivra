import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanText } from "@/lib/portal/http";
import {
  companyLookupFromWebsite,
  enrichApolloOrganization,
  isApolloConfigured,
  normalizeAccountWebsite,
  normalizeApolloSelection,
} from "@/lib/integrations/apollo";

const stages = new Set([
  "lead",
  "onboarding",
  "active",
  "at_risk",
  "inactive",
  "closed",
]);

export async function POST(request: Request) {
  try {
    const { db, userId } = await requireInternalOperator();
    const body = (await request.json()) as Record<string, unknown>;
    const name = cleanText(body.name, 160);
    const legalName = cleanText(body.legalName, 200) || null;
    const industry = cleanText(body.industry, 120) || null;
    const stage = cleanText(body.stage, 30) || "lead";
    const contactName = cleanText(body.contactName, 160);
    const contactEmail = cleanText(body.contactEmail, 254).toLowerCase();
    const websiteInput = cleanText(body.website, 2_048);
    const website = websiteInput ? normalizeAccountWebsite(websiteInput) : null;
    const apolloSelection = normalizeApolloSelection(body.apolloSelection);
    if (!name || !stages.has(stage))
      return NextResponse.json(
        { error: "Enter an account name and valid stage." },
        { status: 400 },
      );
    if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail))
      return NextResponse.json(
        { error: "Enter a valid contact email." },
        { status: 400 },
      );
    if (websiteInput && !website)
      return NextResponse.json(
        { error: "Enter a public http or https account website." },
        { status: 400 },
      );

    // Browser search results are only a convenience preview. Re-resolve the
    // public website on the server so the durable CRM record receives Apollo's
    // complete, current snapshot even when search returned a partial account.
    let enrichment = apolloSelection;
    const lookup = companyLookupFromWebsite(website);
    if (lookup && isApolloConfigured()) {
      const fresh = await enrichApolloOrganization(lookup);
      if (fresh.status === "fresh" && fresh.providerOrganizationId && fresh.name) {
        enrichment = {
          providerOrganizationId: fresh.providerOrganizationId,
          name: fresh.name,
          shortDescription: fresh.shortDescription,
          website: fresh.website,
          logoUrl: fresh.logoUrl,
          linkedinUrl: fresh.linkedinUrl,
          phone: fresh.phone,
          industry: fresh.industry,
          location: fresh.location,
          employeeCount: fresh.employeeCount,
          foundedYear: fresh.foundedYear,
          technologies: fresh.technologies,
        };
      }
    }

    const { data: organization, error: organizationError } = await db
      .from("organizations")
      .insert({
        name,
        legal_name: legalName,
        industry: industry || enrichment?.industry || null,
        primary_contact_name: contactName || null,
      })
      .select("id")
      .single();
    if (organizationError) throw organizationError;
    try {
      const { error: profileError } = await db
        .from("crm_account_profiles")
        .insert({
          organization_id: organization.id,
          lifecycle_stage: stage,
          website: website || enrichment?.website || null,
        });
      if (profileError) throw profileError;
      if (enrichment) {
        const { error: enrichmentError } = await db
          .from("crm_account_enrichments")
          .insert({
            organization_id: organization.id,
            provider: "apollo",
            provider_organization_id: enrichment.providerOrganizationId,
            lookup_domain: (website || enrichment.website)
              ? new URL((website || enrichment.website)!).hostname.replace(/^www\./, "")
              : null,
            match_method: "domain",
            name: enrichment.name,
            short_description: enrichment.shortDescription,
            industry: enrichment.industry,
            website: enrichment.website,
            logo_url: enrichment.logoUrl,
            linkedin_url: enrichment.linkedinUrl,
            phone: enrichment.phone,
            location: enrichment.location,
            employee_count: enrichment.employeeCount,
            founded_year: enrichment.foundedYear,
            technology_names: enrichment.technologies,
            status: "fresh",
            fetched_at: new Date().toISOString(),
            attempted_at: new Date().toISOString(),
          });
        if (enrichmentError) throw enrichmentError;
        if (enrichment.logoUrl) {
          const { error: logoError } = await db
            .from("organizations")
            .update({
              logo_url: enrichment.logoUrl,
              logo_provider: "apollo",
              logo_resolved_at: new Date().toISOString(),
            })
            .eq("id", organization.id);
          if (logoError) throw logoError;
        }
      }
      if (contactName && contactEmail) {
        const { error: contactError } = await db
          .from("crm_contacts")
          .insert({
            organization_id: organization.id,
            full_name: contactName,
            email: contactEmail,
            is_primary: true,
          });
        if (contactError) throw contactError;
      }
      await db
        .from("crm_activities")
        .insert({
          organization_id: organization.id,
          actor_id: userId,
          kind: "account_created",
          direction: "internal",
          subject: "Account added to CRM",
        });
      await db
        .from("internal_audit_events")
        .insert({
          actor_id: userId,
          organization_id: organization.id,
          action: "crm.account_created",
          resource_type: "organization",
          resource_id: organization.id,
        });
      return NextResponse.json(
        { ok: true, id: organization.id },
        { status: 201 },
      );
    } catch (error) {
      await db.from("organizations").delete().eq("id", organization.id);
      throw error;
    }
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
}
