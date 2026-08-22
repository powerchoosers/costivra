import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanText, cleanUuid } from "@/lib/portal/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = { "Cache-Control": "private, no-store" };

/**
 * Internal-only review surface for customer-consented partner requests.
 * This route deliberately exposes scope metadata, not source documents or
 * financial payloads, and never transmits anything to a destination.
 */
export async function GET() {
  try {
    const { db, userId } = await requireInternalOperator();
    const { data, error } = await db
      .from("partner_referral_requests")
      .select(
        "id,organization_id,destination_id,status,purpose,requested_scope,source_context,consent_id,approval_id,created_at,updated_at,partner_destinations(display_name,category,external_enabled)",
      )
      .eq("status", "awaiting_approval")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    await db.from("internal_audit_events").insert({
      actor_id: userId,
      action: "partner_referral.review_queue_viewed",
      resource_type: "partner_referral_request",
      safe_metadata: { count: data?.length ?? 0 },
    });

    return NextResponse.json(
      { requests: data ?? [], externalTransmissionEnabled: false },
      { headers: privateHeaders },
    );
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: privateHeaders },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { db, userId } = await requireInternalOperator();
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const action = cleanText(body?.action, 20);
    const referralId = cleanUuid(body?.referralId);
    if (action !== "block" || !referralId) {
      return NextResponse.json(
        { error: "Only blocking a referral request is available from this review surface." },
        { status: 400, headers: privateHeaders },
      );
    }

    const reason = cleanText(body?.reason, 500) || "Blocked during internal review.";
    const { data: referral, error: updateError } = await db
      .from("partner_referral_requests")
      .update({ status: "blocked", updated_at: new Date().toISOString() })
      .eq("id", referralId)
      .eq("status", "awaiting_approval")
      .select("id,organization_id,destination_id,status,updated_at")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!referral) {
      return NextResponse.json(
        { error: "That referral is no longer awaiting internal review." },
        { status: 409, headers: privateHeaders },
      );
    }

    const { error: auditError } = await db.from("internal_audit_events").insert({
      actor_id: userId,
      organization_id: referral.organization_id,
      action: "partner_referral.blocked",
      resource_type: "partner_referral_request",
      resource_id: referral.id,
      safe_metadata: { destination_id: referral.destination_id, reason },
    });
    if (auditError) throw auditError;

    return NextResponse.json({ referral }, { headers: privateHeaders });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: privateHeaders },
    );
  }
}
