import "server-only";

import { ingestDocumentBuffer } from "@/lib/documents/intake";
import { summarizeInboundAttachmentStates } from "@/lib/email/quarantine-release-policy";
import { scanFileForMalware } from "@/lib/security/malware-scanner";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ServerDatabase = ReturnType<typeof createServerSupabaseClient>;

export async function releaseQuarantinedInboundAttachments(input: {
  db: ServerDatabase;
  organizationId: string;
  eventId?: string | null;
  limit?: number;
}) {
  const { db, organizationId, eventId } = input;
  let query = db.from("inbound_email_attachments")
    .select("id,event_id,filename,content_type,quarantine_storage_path")
    .eq("organization_id", organizationId)
    .eq("processing_status", "quarantined")
    .limit(Math.min(Math.max(input.limit ?? 10, 1), 25));
  if (eventId) query = query.eq("event_id", eventId);
  const { data: attachments, error } = await query;
  if (error) throw error;

  const touchedEvents = new Set<string>();
  let released = 0;
  let stillQuarantined = 0;
  let rejected = 0;
  for (const attachment of attachments ?? []) {
    touchedEvents.add(attachment.event_id);
    if (!attachment.quarantine_storage_path) {
      await db.from("inbound_email_attachments").update({
        scan_status: "failed",
        error_message: "The quarantined source path is missing.",
        updated_at: new Date().toISOString(),
      }).eq("id", attachment.id);
      stillQuarantined += 1;
      continue;
    }
    const stored = await db.storage
      .from("costivra-documents")
      .download(attachment.quarantine_storage_path);
    if (stored.error) {
      await db.from("inbound_email_attachments").update({
        scan_status: "failed",
        error_message: stored.error.message,
        updated_at: new Date().toISOString(),
      }).eq("id", attachment.id);
      stillQuarantined += 1;
      continue;
    }
    const buffer = Buffer.from(await stored.data.arrayBuffer());
    const scan = await scanFileForMalware({
      buffer,
      filename: attachment.filename,
      mimeType: attachment.content_type,
    });
    if (scan.status === "infected") {
      await db.from("inbound_email_attachments").update({
        scan_status: "infected",
        processing_status: "failed",
        quarantine_storage_path: null,
        error_message: "Malware scanner rejected this attachment.",
        updated_at: new Date().toISOString(),
      }).eq("id", attachment.id);
      await db.storage.from("costivra-documents").remove([attachment.quarantine_storage_path]);
      rejected += 1;
      continue;
    }
    if (scan.status !== "clean") {
      await db.from("inbound_email_attachments").update({
        scan_status: scan.status,
        error_message: scan.detail || "Attachment did not pass malware scanning.",
        updated_at: new Date().toISOString(),
      }).eq("id", attachment.id);
      stillQuarantined += 1;
      continue;
    }
    const result = await ingestDocumentBuffer({
      db,
      organizationId,
      actorType: "service",
      actorId: null,
      filename: attachment.filename,
      mimeType: attachment.content_type,
      buffer,
      auditAction: "document.email_quarantine_released",
      malwareScan: scan,
    });
    await db.from("inbound_email_attachments").update({
      scan_status: "clean",
      processing_status: result.duplicate ? "duplicate" : "processed",
      document_id: result.documentId,
      quarantine_storage_path: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    }).eq("id", attachment.id);
    await db.storage.from("costivra-documents").remove([attachment.quarantine_storage_path]);
    released += 1;
  }

  for (const touchedEventId of touchedEvents) {
    const { data: states, error: statesError } = await db
      .from("inbound_email_attachments")
      .select("processing_status")
      .eq("event_id", touchedEventId);
    if (statesError) throw statesError;
    const summary = summarizeInboundAttachmentStates(
      (states ?? []).map((state) => state.processing_status),
    );
    const now = new Date().toISOString();
    const { error: eventError } = await db.from("inbound_email_events").update({
      status: summary.status,
      processed_attachment_count: summary.processedAttachmentCount,
      processed_at: summary.complete ? now : null,
      updated_at: now,
    }).eq("id", touchedEventId).eq("organization_id", organizationId);
    if (eventError) throw eventError;
  }
  return { inspected: attachments?.length ?? 0, released, stillQuarantined, rejected };
}
