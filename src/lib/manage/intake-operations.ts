import "server-only";

import { isMalwareScannerConfigured } from "@/lib/security/malware-scanner";
import { requireInternalOperator } from "@/lib/manage/auth";
import type {
  IntakeAttachment,
  IntakeOperationEvent,
  IntakeOperationStatus,
  ManageIntakeOperationsData,
} from "@/lib/manage/intake-operations-types";
import { STALE_EXTRACTION_AFTER_MS } from "@/lib/documents/retry-extraction";

type Row = Record<string, unknown>;
const rows = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : [];
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const nullable = (value: unknown) => typeof value === "string" && value ? value : null;
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

export async function getManageIntakeOperationsData(
  eventId?: string | null,
): Promise<ManageIntakeOperationsData> {
  const { db } = await requireInternalOperator();
  const [eventsResult, organizationsResult, failedExtractionsResult] = await Promise.all([
    db.from("inbound_email_events")
      .select("id,organization_id,sender_address,subject,body_preview,status,attachment_count,processed_attachment_count,attempt_count,max_attempts,next_attempt_at,last_attempt_at,error_message,received_at,updated_at,processed_at")
      .order("received_at", { ascending: false })
      .limit(500),
    db.from("organizations").select("id,name"),
    db.from("document_extraction_versions")
      .select("document_id,status,failure_code,input_mode,created_at")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);
  if (eventsResult.error) throw eventsResult.error;
  if (organizationsResult.error) throw organizationsResult.error;
  if (failedExtractionsResult.error) throw failedExtractionsResult.error;

  const eventRows = rows(eventsResult.data);
  const eventIds = eventRows.map((row) => text(row.id)).filter(Boolean);
  const organizations = new Map(
    rows(organizationsResult.data).map((row) => [text(row.id), text(row.name, "Unknown client")]),
  );
  const latestFailureByDocument = new Map<string, Row>();
  for (const failure of rows(failedExtractionsResult.data)) {
    const documentId = text(failure.document_id);
    if (documentId && !latestFailureByDocument.has(documentId))
      latestFailureByDocument.set(documentId, failure);
  }
  const failedDocumentIds = [...latestFailureByDocument.entries()]
    .filter(([, extraction]) => text(extraction.status) === "failed")
    .map(([documentId]) => documentId);
  const recoveryDocumentsResult = failedDocumentIds.length
    ? await db.from("documents")
      .select("id,organization_id,original_filename,extraction_summary,status,source_purged_at,created_at")
      .in("id", failedDocumentIds)
      .eq("status", "needs_review")
    : { data: [], error: null };
  if (recoveryDocumentsResult.error) throw recoveryDocumentsResult.error;
  const staleBefore = new Date(Date.now() - STALE_EXTRACTION_AFTER_MS).toISOString();
  const stalledDocumentsResult = await db.from("documents")
    .select("id,organization_id,original_filename,extraction_summary,status,source_purged_at,created_at,updated_at")
    .eq("status", "processing")
    .lt("updated_at", staleBefore)
    .order("updated_at", { ascending: true })
    .limit(250);
  if (stalledDocumentsResult.error) throw stalledDocumentsResult.error;
  const recoveryDocumentRows = new Map<string, { row: Row; recoveryState: "failed" | "stalled" }>();
  for (const document of rows(recoveryDocumentsResult.data))
    recoveryDocumentRows.set(text(document.id), { row: document, recoveryState: "failed" });
  for (const document of rows(stalledDocumentsResult.data))
    recoveryDocumentRows.set(text(document.id), { row: document, recoveryState: "stalled" });
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
    recoveryDocuments: [...recoveryDocumentRows.values()].map(({ row: document, recoveryState }) => {
      const failure = latestFailureByDocument.get(text(document.id));
      const inputMode = nullable(failure?.input_mode);
      return {
        id: text(document.id),
        organizationId: text(document.organization_id),
        organizationName: organizations.get(text(document.organization_id)) ?? "Unknown client",
        filename: text(document.original_filename, "Source document"),
        summary: nullable(document.extraction_summary),
        failureCode: text(failure?.failure_code, "extraction_failed"),
        inputMode: inputMode === "native_text" || inputMode === "pdf_ocr" || inputMode === "image_vision" ? inputMode : null,
        createdAt: text(document.created_at),
        sourceAvailable: !document.source_purged_at,
        recoveryState,
      };
    }),
  };
}
