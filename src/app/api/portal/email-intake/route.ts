import { NextResponse } from "next/server";
import { getInboundEmailDomain, isInboundEmailPlatformReady, verifyInboundEmailProviderReadiness } from "@/lib/email/resend";
import { releaseQuarantinedInboundAttachments } from "@/lib/email/quarantine-release";
import { apiError, cleanText } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { isMalwareScannerConfigured } from "@/lib/security/malware-scanner";

export const runtime = "nodejs";
export const maxDuration = 60;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PATCH(request: Request) {
  try {
    const { db, organizationId, userId, role } = await requirePortalContext();
    if (!['owner','admin'].includes(role)) return NextResponse.json({ error: "Only an owner or administrator can change email intake settings." }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const operation = cleanText(body.operation, 40);
    const eventId = cleanText(body.eventId, 50);
    const { data: intake, error: intakeError } = await db.from("inbound_email_addresses").select("id,status,trusted_senders,local_part,domain").eq("organization_id", organizationId).single();
    if (intakeError || !intake) return NextResponse.json({ error: "Email intake is not available for this workspace." }, { status: 404 });

    if (operation === "activate") {
      const emailProviderReadiness = await verifyInboundEmailProviderReadiness();
      if (!isInboundEmailPlatformReady() || !emailProviderReadiness.ok) {
        const reason = emailProviderReadiness.blocked.join(" ");
        return NextResponse.json({
          error: emailProviderReadiness.ok
            ? "The receiving domain, signed webhook, and malware scanner must be verified before activation."
            : `The email intake provider is not ready.${reason ? ` ${reason}` : " Verify Resend key, domain, and webhook configuration."}`,
        }, { status: 503 });
      }
      const { error } = await db.from("inbound_email_addresses").update({ status: "active", domain: getInboundEmailDomain(), updated_at: new Date().toISOString() }).eq("id", intake.id);
      if (error) throw error;
      await db.from("integrations").update({ status: "connected", updated_at: new Date().toISOString() }).eq("organization_id", organizationId).eq("provider", "resend_inbound");
    } else if (operation === "pause") {
      const { error } = await db.from("inbound_email_addresses").update({ status: "paused", updated_at: new Date().toISOString() }).eq("id", intake.id);
      if (error) throw error;
      await db.from("integrations").update({ status: "paused", updated_at: new Date().toISOString() }).eq("organization_id", organizationId).eq("provider", "resend_inbound");
    } else if (operation === "add_sender" || operation === "remove_sender") {
      const sender = cleanText(body.sender, 320).toLowerCase();
      if (!emailPattern.test(sender)) return NextResponse.json({ error: "Enter a valid forwarding email address." }, { status: 400 });
      const current = Array.isArray(intake.trusted_senders) ? intake.trusted_senders.filter((value): value is string => typeof value === "string") : [];
      const next = operation === "add_sender" ? Array.from(new Set([...current, sender])).slice(0, 25) : current.filter((value) => value !== sender);
      const { error } = await db.from("inbound_email_addresses").update({ trusted_senders: next, updated_at: new Date().toISOString() }).eq("id", intake.id);
      if (error) throw error;
    } else if (operation === "retry") {
      if (!isMalwareScannerConfigured()) return NextResponse.json({ error: "A malware scanner must be configured before quarantined files can be processed." }, { status: 503 });
      await releaseQuarantinedInboundAttachments({ db, organizationId, limit: 1 });
    } else if (operation === "retry_failed") {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId)) return NextResponse.json({ error: "Choose a valid intake event to retry." }, { status: 400 });
      const now = new Date().toISOString();
      const { data: queued, error } = await db.from("inbound_email_events").update({ status: "queued", attempt_count: 0, next_attempt_at: now, last_attempt_at: null, locked_at: null, lock_token: null, processed_at: null, error_message: null, updated_at: now }).eq("id", eventId).eq("organization_id", organizationId).eq("status", "dead_letter").select("id").maybeSingle();
      if (error) throw error;
      if (!queued) return NextResponse.json({ error: "This intake event is no longer waiting for a manual retry." }, { status: 409 });
    } else {
      return NextResponse.json({ error: "Unsupported email intake operation." }, { status: 400 });
    }

    await db.from("audit_events").insert({ organization_id: organizationId, actor_type: "user", actor_id: userId, action: `email_intake.${operation}`, resource_type: operation === "retry_failed" ? "inbound_email_event" : "inbound_email_address", resource_id: operation === "retry_failed" ? eventId : intake.id });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
