import "server-only";

import { isMalwareScannerConfigured } from "@/lib/security/malware-scanner";
import { requireInternalOperator } from "@/lib/manage/auth";
import type {
  IntakeAttachment,
  IntakeOperationEvent,
  IntakeOperationStatus,
  ManageIntakeOperationsData,
} from "@/lib/manage/intake-operations-types";

type Row = Record<string, unknown>;
const rows = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : [];
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const nullable = (value: unknown) => typeof value === "string" && value ? value : null;
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

export async function getManageIntakeOperationsData(
  eventId?: string | null,
): Promise<ManageIntakeOperationsData> {
  const { db } = await requireInternalOperator();
  const [eventsResult, organizationsResult] = await Promise.all([
    db.from("inbound_email_events")
      .select("id,organization_id,sender_address,subject,body_preview,status,attachment_count,processed_attachment_count,attempt_count,max_attempts,next_attempt_at,last_attempt_at,error_message,received_at,updated_at,processed_at")
      .order("received_at", { ascending: false })
      .limit(500),
    db.from("organizations").select("id,name"),
  ]);
  if (eventsResult.error) throw eventsResult.error;
  if (organizationsResult.error) throw organizationsResult.error;

  const eventRows = rows(eventsResult.data);
  const eventIds = eventRows.map((row) => text(row.id)).filter(Boolean);
  const organizations = new Map(
    rows(organizationsResult.data).map((row) => [text(row.id), text(row.name, "Unknown client")]),
  );
  const attachmentsResult = eventIds.length
    ? await db.from("inbound_email_attachments")
      .select("id,event_id,filename,content_type,byte_size,scan_status,processing_status,error_message,document_id,created_at")
      .in("event_id", eventIds)
      .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (attachmentsResult.error) throw attachmentsResult.error;
  const attachmentRows = rows(attachmentsResult.data);
  const documentIds = attachmentRows.map((row) => text(row.document_id)).filter(Boolean);
  const invoicesResult = documentIds.length
    ? await db.from("invoices").select("id,document_id").in("document_id", documentIds)
    : { data: [], error: null };
  if (invoicesResult.error) throw invoicesResult.error;
  const invoiceByDocument = new Map(
    rows(invoicesResult.data).map((row) => [text(row.document_id), text(row.id)]),
  );
  const attachmentsByEvent = new Map<string, IntakeAttachment[]>();
  for (const row of attachmentRows) {
    const eventKey = text(row.event_id);
    const documentId = nullable(row.document_id);
    const attachment: IntakeAttachment = {
      id: text(row.id),
      filename: text(row.filename, "Attachment"),
      contentType: text(row.content_type, "application/octet-stream"),
      byteSize: number(row.byte_size),
      scanStatus: text(row.scan_status, "pending"),
      processingStatus: text(row.processing_status, "pending"),
      errorMessage: nullable(row.error_message),
      documentId,
      invoiceId: documentId ? invoiceByDocument.get(documentId) ?? null : null,
      createdAt: text(row.created_at),
    };
    attachmentsByEvent.set(eventKey, [...(attachmentsByEvent.get(eventKey) ?? []), attachment]);
  }

  const events: IntakeOperationEvent[] = eventRows.map((row) => ({
    id: text(row.id),
    organizationId: text(row.organization_id),
    organizationName: organizations.get(text(row.organization_id)) ?? "Unknown client",
    senderAddress: text(row.sender_address),
    subject: text(row.subject, "(no subject)"),
    bodyPreview: nullable(row.body_preview),
    status: text(row.status, "received") as IntakeOperationStatus,
    attachmentCount: number(row.attachment_count),
    processedAttachmentCount: number(row.processed_attachment_count),
    attemptCount: number(row.attempt_count),
    maxAttempts: number(row.max_attempts),
    nextAttemptAt: nullable(row.next_attempt_at),
    lastAttemptAt: nullable(row.last_attempt_at),
    errorMessage: nullable(row.error_message),
    receivedAt: text(row.received_at),
    updatedAt: text(row.updated_at),
    processedAt: nullable(row.processed_at),
    attachments: attachmentsByEvent.get(text(row.id)) ?? [],
  }));

  return {
    events,
    selectedEvent: eventId ? events.find((event) => event.id === eventId) ?? null : null,
    scannerConfigured: isMalwareScannerConfigured(),
  };
}
