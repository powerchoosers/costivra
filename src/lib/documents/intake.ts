import { createHash, randomUUID } from "node:crypto";
import { analyzeDocument, analyzeScannedPdf } from "@/lib/ai/document-intelligence";
import { createInvoiceRecordFromExtraction } from "@/lib/documents/invoice-record";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024;
export const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

type DatabaseClient = ReturnType<typeof createServerSupabaseClient>;

async function extractText(buffer: Buffer, mimeType: string) {
  if (mimeType === "text/plain") return { text: buffer.toString("utf8"), pageCount: 1 };
  if (mimeType === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return { text: result.text, pageCount: result.total };
    } finally { await parser.destroy(); }
  }
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, pageCount: null };
  }
  return { text: "", pageCount: null };
}

export async function ingestDocumentBuffer(input: {
  db: DatabaseClient;
  organizationId: string;
  actorId?: string | null;
  actorType: "user" | "service";
  filename: string;
  mimeType: string;
  buffer: Buffer;
  organizationVendorId?: string | null;
  sourceType?: "manual_upload" | "email_forwarding" | "provider_integration";
  auditAction: string;
}) {
  if (!DOCUMENT_MIME_TYPES.has(input.mimeType)) throw new Error("Unsupported document type.");
  if (!input.buffer.length || input.buffer.length > MAX_DOCUMENT_SIZE) throw new Error("Document size is outside the supported range.");

  const sha256 = createHash("sha256").update(input.buffer).digest("hex");
  const { data: duplicate, error: duplicateError } = await input.db.from("documents").select("id,original_filename").eq("organization_id", input.organizationId).eq("sha256", sha256).maybeSingle();
  if (duplicateError) throw duplicateError;
  if (duplicate) return { duplicate: true as const, documentId: duplicate.id as string, originalFilename: duplicate.original_filename as string, sha256 };

  const safeName = input.filename.replace(/[^A-Za-z0-9._-]/g, "-").slice(-180) || "document";
  const now = new Date();
  const storagePath = `${input.organizationId}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}-${safeName}`;
  const { data: document, error: insertError } = await input.db.from("documents").insert({
    organization_id: input.organizationId,
    organization_vendor_id: input.organizationVendorId || null,
    storage_path: storagePath,
    original_filename: input.filename.slice(0, 255),
    mime_type: input.mimeType,
    byte_size: input.buffer.length,
    sha256,
    status: "pending_upload",
    uploaded_by: input.actorId || null,
  }).select("id").single();
  if (insertError) throw insertError;

  const uploaded = await input.db.storage.from("costivra-documents").upload(storagePath, input.buffer, { contentType: input.mimeType, upsert: false });
  if (uploaded.error) {
    await input.db.from("documents").delete().eq("id", document.id);
    throw uploaded.error;
  }
  await input.db.from("documents").update({ status: "processing" }).eq("id", document.id);

  try {
    const extracted = await extractText(input.buffer, input.mimeType);
    const usedPdfOcr = input.mimeType === "application/pdf" && !extracted.text.trim();
    if (!extracted.text.trim() && !usedPdfOcr) throw new Error("No readable text was found in this document.");
    const intelligence = usedPdfOcr
      ? await analyzeScannedPdf({ documentName: input.filename, buffer: input.buffer })
      : await analyzeDocument({ documentName: input.filename, mimeType: input.mimeType, extractedText: extracted.text });
    const { data: version, error: versionError } = await input.db.from("document_extraction_versions").insert({
      document_id: document.id,
      extractor_version: "costivra-intake-v3",
      provider: usedPdfOcr ? "openrouter-pdf-ocr" : "openrouter",
      model_identifier: process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini",
      schema_version: "cost-document-v2",
      status: intelligence.confidence < .75 ? "needs_review" : "completed",
      structured_output: intelligence,
      confidence: intelligence.confidence,
      completed_at: new Date().toISOString(),
    }).select("id").single();
    if (versionError) throw versionError;
    if (intelligence.evidence.length) {
      const evidenceRows = intelligence.evidence.map((evidence) => ({ document_id: document.id, page_number: 1, text_excerpt: evidence.quote, field_path: evidence.field }));
      const { error: evidenceError } = await input.db.from("evidence_references").insert(evidenceRows);
      if (evidenceError) throw evidenceError;
    }
    const invoiceRecord = await createInvoiceRecordFromExtraction({
      db: input.db,
      organizationId: input.organizationId,
      documentId: document.id,
      extractionVersionId: version.id,
      providedRelationshipId: input.organizationVendorId,
      sourceType: input.sourceType ?? (input.actorType === "service" ? "email_forwarding" : "manual_upload"),
      intelligence,
    });
    const finalStatus = intelligence.confidence < .75 || invoiceRecord?.reviewStatus === "needs_review" ? "needs_review" : "ready";
    await input.db.from("documents").update({ page_count: extracted.pageCount, document_type: intelligence.classification, extraction_summary: intelligence.summary, status: finalStatus, updated_at: new Date().toISOString() }).eq("id", document.id);
    await input.db.from("audit_events").insert({ organization_id: input.organizationId, actor_type: input.actorType, actor_id: input.actorId || null, action: input.auditAction, resource_type: "document", resource_id: document.id });
    return { duplicate: false as const, documentId: document.id as string, extractionVersionId: version.id as string, invoiceRecord, status: finalStatus, sha256 };
  } catch (analysisError) {
    await input.db.from("document_extraction_versions").insert({ document_id: document.id, extractor_version: "costivra-intake-v3", provider: "openrouter", schema_version: "cost-document-v2", status: "failed", error_message: analysisError instanceof Error ? analysisError.message.slice(0, 1000) : "Extraction failed" });
    await input.db.from("documents").update({ status: "needs_review", updated_at: new Date().toISOString() }).eq("id", document.id);
    await input.db.from("audit_events").insert({ organization_id: input.organizationId, actor_type: input.actorType, actor_id: input.actorId || null, action: input.auditAction, resource_type: "document", resource_id: document.id });
    return { duplicate: false as const, documentId: document.id as string, status: "needs_review" as const, warning: "Automatic extraction needs review.", sha256 };
  }
}
