import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { analyzeDocument } from "@/lib/ai/document-intelligence";
import { apiError, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const allowedTypes = new Set([
  "application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

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

export async function POST(request: Request) {
  try {
    const { db, organizationId, userId } = await requirePortalContext();
    const form = await request.formData();
    const file = form.get("file");
    const organizationVendorId = cleanUuid(form.get("organizationVendorId"));
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "Upload a PDF, text file, or DOCX document." }, { status: 415 });
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Files must be between 1 byte and 20 MB." }, { status: 413 });
    if (organizationVendorId) {
      const { data: relationship } = await db.from("organization_vendors").select("id").eq("id", organizationVendorId).eq("organization_id", organizationId).maybeSingle();
      if (!relationship) return NextResponse.json({ error: "The selected vendor is not available." }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const { data: duplicate } = await db.from("documents").select("id,original_filename").eq("organization_id", organizationId).eq("sha256", sha256).maybeSingle();
    if (duplicate) return NextResponse.json({ error: `This file already exists as ${duplicate.original_filename}.`, documentId: duplicate.id }, { status: 409 });

    const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "-").slice(-180);
    const now = new Date();
    const storagePath = `${organizationId}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}-${safeName}`;
    const { data: document, error: insertError } = await db.from("documents").insert({
      organization_id: organizationId, organization_vendor_id: organizationVendorId || null,
      storage_path: storagePath, original_filename: file.name.slice(0, 255), mime_type: file.type,
      byte_size: file.size, sha256, status: "pending_upload", uploaded_by: userId,
    }).select("id").single();
    if (insertError) throw insertError;

    const uploaded = await db.storage.from("costivra-documents").upload(storagePath, buffer, { contentType: file.type, upsert: false });
    if (uploaded.error) {
      await db.from("documents").delete().eq("id", document.id);
      throw uploaded.error;
    }
    await db.from("documents").update({ status: "processing" }).eq("id", document.id);

    try {
      const extracted = await extractText(buffer, file.type);
      if (!extracted.text.trim()) throw new Error("No readable text was found in this document.");
      const intelligence = await analyzeDocument({ documentName: file.name, mimeType: file.type, extractedText: extracted.text });
      const { data: version, error: versionError } = await db.from("document_extraction_versions").insert({
        document_id: document.id, extractor_version: "costivra-intake-v1", provider: "openrouter",
        model_identifier: process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini", schema_version: "cost-document-v1",
        status: intelligence.confidence < .75 ? "needs_review" : "completed", structured_output: intelligence,
        confidence: intelligence.confidence, completed_at: new Date().toISOString(),
      }).select("id").single();
      if (versionError) throw versionError;
      if (intelligence.evidence.length) {
        const evidenceRows = intelligence.evidence.map((evidence) => ({ document_id: document.id, page_number: 1, text_excerpt: evidence.quote, field_path: evidence.field }));
        const { error: evidenceError } = await db.from("evidence_references").insert(evidenceRows);
        if (evidenceError) throw evidenceError;
      }
      await db.from("documents").update({
        page_count: extracted.pageCount, document_type: intelligence.classification,
        extraction_summary: intelligence.summary, status: intelligence.confidence < .75 ? "needs_review" : "ready",
        updated_at: new Date().toISOString(),
      }).eq("id", document.id);
      await db.from("audit_events").insert({ organization_id: organizationId, actor_type: "user", actor_id: userId, action: "document.uploaded_and_extracted", resource_type: "document", resource_id: document.id });
      return NextResponse.json({ ok: true, documentId: document.id, extractionVersionId: version.id }, { status: 201 });
    } catch (analysisError) {
      await db.from("document_extraction_versions").insert({ document_id: document.id, extractor_version: "costivra-intake-v1", provider: "openrouter", schema_version: "cost-document-v1", status: "failed", error_message: analysisError instanceof Error ? analysisError.message.slice(0, 1000) : "Extraction failed" });
      await db.from("documents").update({ status: "needs_review", updated_at: new Date().toISOString() }).eq("id", document.id);
      return NextResponse.json({ ok: true, documentId: document.id, warning: "The source file is stored safely, but automatic extraction needs review." }, { status: 201 });
    }
  } catch (error) { return apiError(error); }
}
