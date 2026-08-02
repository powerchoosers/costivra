import { NextResponse } from "next/server";
import { releaseQuarantinedInboundAttachments } from "@/lib/email/quarantine-release";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { canRetryInboundEvent } from "@/lib/manage/intake-operations-policy";
import type { IntakeOperationStatus } from "@/lib/manage/intake-operations-types";
import { isMalwareScannerConfigured } from "@/lib/security/malware-scanner";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const operator = await requireInternalOperator();
    const { id } = await context.params;
    if (!uuid.test(id)) {
      return NextResponse.json({ error: "Choose a valid intake event." }, { status: 400 });
    }
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const { data: event, error: eventError } = await operator.db
      .from("inbound_email_events")
      .select("id,organization_id,status")
      .eq("id", id)
      .maybeSingle();
    if (eventError) throw eventError;
    if (!event) return NextResponse.json({ error: "That intake event no longer exists." }, { status: 404 });

    let result: Record<string, unknown> = {};
    if (action === "retry") {
      if (!canRetryInboundEvent(event.status as IntakeOperationStatus)) {
        return NextResponse.json({ error: "This event is no longer waiting for a manual retry." }, { status: 409 });
      }
      const now = new Date().toISOString();
      const { data: queued, error: retryError } = await operator.db
        .from("inbound_email_events")
        .update({
          status: "queued",
          attempt_count: 0,
          next_attempt_at: now,
          last_attempt_at: null,
          locked_at: null,
          lock_token: null,
          processed_at: null,
          error_message: null,
          updated_at: now,
        })
        .eq("id", id)
        .eq("status", event.status)
        .select("id")
        .maybeSingle();
      if (retryError) throw retryError;
      if (!queued) {
        return NextResponse.json({ error: "The event changed before it could be retried. Refresh and try again." }, { status: 409 });
      }
      result = { queued: true };
    } else if (action === "rescan") {
      if (!isMalwareScannerConfigured()) {
        return NextResponse.json({ error: "Connect the malware scanner before releasing quarantined files." }, { status: 503 });
      }
      if (event.status !== "quarantined") {
        return NextResponse.json({ error: "This event no longer has files waiting in quarantine." }, { status: 409 });
      }
      result = await releaseQuarantinedInboundAttachments({
        db: operator.db,
        organizationId: event.organization_id,
        eventId: id,
        limit: 25,
      });
    } else {
      return NextResponse.json({ error: "Unsupported intake operation." }, { status: 400 });
    }

    const { error: auditError } = await operator.db.from("internal_audit_events").insert({
      actor_id: operator.userId,
      organization_id: event.organization_id,
      action: `intake_event.${action}`,
      resource_type: "inbound_email_event",
      resource_id: id,
      safe_metadata: result,
    });
    if (auditError) throw auditError;
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
