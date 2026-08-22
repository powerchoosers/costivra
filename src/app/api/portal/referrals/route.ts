import { NextResponse } from "next/server";
import { apiError, cleanText, cleanUuid, PortalInputError } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { portalRoleCanWrite } from "@/lib/portal/access";

function safeScope(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const recordIds = Array.isArray(input.recordIds)
    ? input.recordIds.filter((id): id is string => Boolean(cleanUuid(id))).slice(0, 50)
    : [];
  return {
    recordIds,
    includeSourceDocuments: input.includeSourceDocuments === true,
    includeExtractedFields: input.includeExtractedFields !== false,
    includeFinancialAmounts: input.includeFinancialAmounts === true,
  };
}

function safeContext(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const vendorRelationshipId = cleanUuid(input.vendorRelationshipId);
  const contextKind = cleanText(input.contextKind, 40);
  return {
    ...(vendorRelationshipId ? { vendorRelationshipId } : {}),
    ...(contextKind && ["vendor", "invoice", "finding", "account"].includes(contextKind) ? { contextKind } : {}),
  };
}

export async function GET() {
  try {
    const { db, organizationId } = await requirePortalContext();
    const [{ data: destinations, error: destinationError }, { data: requests, error: requestError }] = await Promise.all([
      db.from("partner_destinations").select("id,slug,display_name,category,description,disclosure_version,disclosure_text,status,external_enabled").eq("status", "available").order("display_name"),
      db.from("partner_referral_requests").select("id,destination_id,status,purpose,requested_scope,source_context,created_at,updated_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(20),
    ]);
    if (destinationError) throw destinationError;
    if (requestError) throw requestError;
    return NextResponse.json({ destinations: destinations ?? [], requests: requests ?? [] });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { db, organizationId, userId, role } = await requirePortalContext();
    if (!portalRoleCanWrite(role)) throw new Error("PORTAL_READ_ONLY");
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const action = cleanText(body?.action, 20);

    if (action === "start") {
      const destinationSlug = cleanText(body?.destinationSlug, 100);
      const purpose = cleanText(body?.purpose, 500);
      if (!destinationSlug || purpose.length < 10) throw new PortalInputError("Choose a destination and explain what review you are requesting.");
      const { data: destination, error: destinationError } = await db.from("partner_destinations").select("id,slug,display_name,category,description,disclosure_version,disclosure_text,status,external_enabled").eq("slug", destinationSlug).eq("status", "available").maybeSingle();
      if (destinationError) throw destinationError;
      if (!destination) throw new PortalInputError("That partner destination is not currently available.");
      const { data: referral, error } = await db.from("partner_referral_requests").insert({
        organization_id: organizationId,
        destination_id: destination.id,
        requested_by: userId,
        purpose,
        requested_scope: safeScope(body?.requestedScope),
        source_context: safeContext(body?.sourceContext),
        status: "consent_required",
      }).select("id,destination_id,status,purpose,requested_scope,source_context,created_at,updated_at").single();
      if (error) throw error;
      await db.from("audit_events").insert({ organization_id: organizationId, actor_type: "user", actor_id: userId, action: "partner_referral.request_started", resource_type: "partner_referral_request", resource_id: referral.id, safe_metadata: { destination: destination.slug, purpose_length: purpose.length } });
      return NextResponse.json({ referral, destination, next: "consent_required" }, { status: 201 });
    }

    if (action === "consent") {
      const referralId = cleanUuid(body?.referralId);
      const granted = body?.granted === true;
      if (!referralId) throw new PortalInputError("A valid referral request is required.");
      const { data: referral, error: referralError } = await db.from("partner_referral_requests").select("id,destination_id,status,purpose,requested_scope").eq("id", referralId).eq("organization_id", organizationId).maybeSingle();
      if (referralError) throw referralError;
      if (!referral) throw new PortalInputError("Referral request not found.");
      if (referral.status !== "consent_required") throw new PortalInputError("This referral request is no longer awaiting consent.");
      const { data: destination, error: destinationError } = await db.from("partner_destinations").select("id,slug,display_name,disclosure_version,disclosure_text,external_enabled").eq("id", referral.destination_id).maybeSingle();
      if (destinationError) throw destinationError;
      if (!destination) throw new PortalInputError("The referral destination is no longer available.");
      const approvedScope = safeScope(body?.approvedScope ?? referral.requested_scope);
      const { data: consent, error: consentError } = await db.from("partner_referral_consents").insert({
        referral_request_id: referral.id,
        organization_id: organizationId,
        destination_id: destination.id,
        actor_id: userId,
        disclosure_version: destination.disclosure_version,
        disclosure_text: destination.disclosure_text,
        purpose: referral.purpose,
        approved_scope: approvedScope,
        granted,
        granted_at: granted ? new Date().toISOString() : null,
      }).select("id,referral_request_id,granted,granted_at,approved_scope,disclosure_version").single();
      if (consentError) throw consentError;
      const status = granted ? "awaiting_approval" : "declined";
      const { data: updated, error: updateError } = await db.from("partner_referral_requests").update({ status, consent_id: consent.id, updated_at: new Date().toISOString() }).eq("id", referral.id).eq("organization_id", organizationId).select("id,destination_id,status,purpose,requested_scope,source_context,consent_id,created_at,updated_at").single();
      if (updateError) throw updateError;
      await db.from("audit_events").insert({ organization_id: organizationId, actor_type: "user", actor_id: userId, action: granted ? "partner_referral.consent_granted" : "partner_referral.consent_declined", resource_type: "partner_referral_request", resource_id: referral.id, safe_metadata: { destination: destination.slug, disclosure_version: destination.disclosure_version, scope_keys: Object.keys(approvedScope) } });
      return NextResponse.json({ referral: updated, consent, destination, next: granted ? "awaiting_approval" : "closed" });
    }

    throw new PortalInputError("Unsupported referral action.");
  } catch (error) {
    return apiError(error);
  }
}
