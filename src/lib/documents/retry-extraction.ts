import { createHash } from "node:crypto";
import { processDocumentBuffer } from "@/lib/documents/intake";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type DatabaseClient = ReturnType<typeof createServerSupabaseClient>;
export const STALE_EXTRACTION_AFTER_MS = 10 * 60 * 1000;

export function isStaleDocumentProcessing(status: string, updatedAt: string, now = Date.now()) {
  if (status !== "processing") return false;
  const timestamp = new Date(updatedAt).getTime();
  return Number.isFinite(timestamp) && timestamp <= now - STALE_EXTRACTION_AFTER_MS;
}

export async function retryFailedDocumentExtraction(input: {
  db: DatabaseClient;
  documentId: string;
  actorId: string;
}) {
  const { data: document, error: documentError } = await input.db
    .from("documents")
    .select("id,organization_id,organization_vendor_id,storage_path,original_filename,mime_type,sha256,status,source_purged_at,updated_at")
    .eq("id", input.documentId)
    .maybeSingle();
  if (documentError) throw documentError;
  if (!document) return { outcome: "not_found" as const };
  if (document.source_purged_at || !document.storage_path)
    return { outcome: "source_unavailable" as const };
  const staleProcessing = isStaleDocumentProcessing(document.status, document.updated_at);
  if (document.status !== "needs_review" && !staleProcessing)
    return { outcome: "not_retryable" as const };

  const [{ data: latest, error: latestError }, { data: invoice, error: invoiceError }, { data: inboundAttachment, error: inboundError }] = await Promise.all([
    input.db.from("document_extraction_versions")
      .select("id,status,failure_code")
      .eq("document_id", document.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    input.db.from("invoices").select("id,review_status").eq("document_id", document.id).limit(1).maybeSingle(),
    input.db.from("inbound_email_attachments").select("id").eq("document_id", document.id).limit(1).maybeSingle(),
  ]);
  if (latestError) throw latestError;
  if (invoiceError) throw invoiceError;
  if (inboundError) throw inboundError;
  if (staleProcessing && invoice) {
    const repairedStatus = invoice.review_status === "needs_review" ? "needs_review" : "ready";
    const { data: repaired, error: repairError } = await input.db.from("documents")
      .update({ status: repairedStatus, updated_at: new Date().toISOString() })
      .eq("id", document.id)
      .eq("organization_id", document.organization_id)
      .eq("status", "processing")
      .eq("updated_at", document.updated_at)
      .select("id")
      .maybeSingle();
    if (repairError) throw repairError;
    if (!repaired) return { outcome: "changed" as const };
    return { outcome: "reconciled" as const, status: repairedStatus, invoiceId: invoice.id as string };
  }

  // Low-confidence successful extractions belong in invoice review. Retrying
  // those here would create a duplicate financial record.
  if ((!staleProcessing && (!latest || latest.status !== "failed")) || invoice)
    return { outcome: "not_retryable" as const };

  const stored = await input.db.storage.from("costivra-documents").download(document.storage_path);
  if (stored.error) throw stored.error;
  const buffer = Buffer.from(await stored.data.arrayBuffer());
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  if (!document.sha256 || sha256 !== document.sha256)
    throw new Error("DOCUMENT_DIGEST_MISMATCH");

  const { data: claimed, error: claimError } = await input.db.from("documents")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", document.id)
    .eq("organization_id", document.organization_id)
    .eq("status", document.status)
    .eq("updated_at", document.updated_at)
    .select("id")
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return { outcome: "changed" as const };

  const result = await processDocumentBuffer({
    db: input.db,
    documentId: document.id,
    organizationId: document.organization_id,
    actorId: input.actorId,
    actorType: "user",
    filename: document.original_filename,
    mimeType: document.mime_type,
    buffer,
    organizationVendorId: document.organization_vendor_id,
    sourceType: inboundAttachment ? "email_forwarding" : "manual_upload",
    auditAction: "document.extraction_retried",
    sha256,
  });
  return { outcome: "processed" as const, ...result };
}
