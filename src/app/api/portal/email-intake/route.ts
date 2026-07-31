import { NextResponse } from "next/server";
import { ingestDocumentBuffer } from "@/lib/documents/intake";
import { getInboundEmailDomain, isInboundEmailPlatformReady } from "@/lib/email/resend";
import { apiError, cleanText } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { isMalwareScannerConfigured, scanFileForMalware } from "@/lib/security/malware-scanner";

export const runtime = "nodejs";
export const maxDuration = 60;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PATCH(request: Request) {
  try {
    const { db, organizationId, userId, role } = await requirePortalContext();
    if (!['owner','admin'].includes(role)) return NextResponse.json({ error: "Only an owner or administrator can change email intake settings." }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const operation = cleanText(body.operation, 40);
    const { data: intake, error: intakeError } = await db.from("inbound_email_addresses").select("id,status,trusted_senders,local_part,domain").eq("organization_id", organizationId).single();
    if (intakeError || !intake) return NextResponse.json({ error: "Email intake is not available for this workspace." }, { status: 404 });

    if (operation === "activate") {
      if (!isInboundEmailPlatformReady()) return NextResponse.json({ error: "The receiving domain, signed webhook, and malware scanner must be verified before activation." }, { status: 503 });
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
      const { data: attachments, error } = await db.from("inbound_email_attachments").select("id,event_id,filename,content_type,quarantine_storage_path").eq("organization_id", organizationId).eq("processing_status", "quarantined").limit(10);
      if (error) throw error;
      const touchedEvents = new Set<string>();
      for (const attachment of attachments ?? []) {
        if (!attachment.quarantine_storage_path) continue;
        touchedEvents.add(attachment.event_id);
        const stored = await db.storage.from("costivra-documents").download(attachment.quarantine_storage_path);
        if (stored.error) {
          await db.from("inbound_email_attachments").update({ scan_status: "failed", error_message: stored.error.message, updated_at: new Date().toISOString() }).eq("id", attachment.id);
          continue;
        }
        const buffer = Buffer.from(await stored.data.arrayBuffer());
        const scan = await scanFileForMalware({ buffer, filename: attachment.filename, mimeType: attachment.content_type });
        if (scan.status !== "clean") {
          await db.from("inbound_email_attachments").update({ scan_status: scan.status, error_message: scan.detail || "Attachment did not pass malware scanning.", updated_at: new Date().toISOString() }).eq("id", attachment.id);
          continue;
        }
        const result = await ingestDocumentBuffer({ db, organizationId, actorType: "service", actorId: null, filename: attachment.filename, mimeType: attachment.content_type, buffer, auditAction: "document.email_quarantine_released" });
        await db.from("inbound_email_attachments").update({ scan_status: "clean", processing_status: result.duplicate ? "duplicate" : "processed", document_id: result.documentId, quarantine_storage_path: null, error_message: null, updated_at: new Date().toISOString() }).eq("id", attachment.id);
        await db.storage.from("costivra-documents").remove([attachment.quarantine_storage_path]);
      }
      for (const eventId of touchedEvents) {
        const { data: states } = await db.from("inbound_email_attachments").select("processing_status").eq("event_id", eventId);
        const remaining = (states ?? []).some((state) => state.processing_status === "quarantined" || state.processing_status === "pending");
        const failed = (states ?? []).some((state) => state.processing_status === "failed" || state.processing_status === "unsupported");
        const processed = (states ?? []).filter((state) => state.processing_status === "processed" || state.processing_status === "duplicate").length;
        await db.from("inbound_email_events").update({ status: remaining ? "quarantined" : failed ? "needs_review" : "processed", processed_attachment_count: processed, processed_at: remaining ? null : new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", eventId).eq("organization_id", organizationId);
      }
    } else {
      return NextResponse.json({ error: "Unsupported email intake operation." }, { status: 400 });
    }

    await db.from("audit_events").insert({ organization_id: organizationId, actor_type: "user", actor_id: userId, action: `email_intake.${operation}`, resource_type: "inbound_email_address", resource_id: intake.id });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
