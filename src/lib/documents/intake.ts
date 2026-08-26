import { createHash, randomUUID } from "node:crypto";
import { runDocumentDataQualityAgent } from "@/lib/ai/document-data-quality-agent";
import { runDocumentExtractionAgent } from "@/lib/ai/document-extraction-agent";
import { agentTraceFromError, safeAgentTraceMetadata, type GovernedAgentTrace } from "@/lib/ai/governed-agent";
import { createContractRecordFromExtraction } from "@/lib/documents/contract-record";
import { createInvoiceRecordFromExtraction } from "@/lib/documents/invoice-record";
import { persistDetectedServiceLocation, type DetectedServiceLocationResolution } from "@/lib/domain/service-location";
import { normalizeAddress, resolveWorkspaceCustomer, type IdentityMatchStatus } from "@/lib/domain/invoice-matching";
import { extractDocumentText, hasMeaningfulExtractedText } from "@/lib/documents/text-extraction";
import {
  classifyDocumentExtractionFailure,
  documentExtractionReviewSummary,
  safeExtractionError,
  type DocumentExtractionInputMode,
} from "@/lib/documents/extraction-failure";
import type { MalwareScanResult } from "@/lib/security/malware-scanner";
import { persistDocumentSecurityScan } from "@/lib/security/document-scan-provenance";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024;
export const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);

export function evidencePageNumber(
  inputMode: DocumentExtractionInputMode,
  pageCount: number | null,
  explicitPageNumber: number | null | undefined,
) {
  return explicitPageNumber ?? (inputMode === "native_text" ? 1 : pageCount === 1 ? 1 : null);
}

export function shouldUsePdfOcr(mimeType: string, extractedText: string): boolean {
  return mimeType === "application/pdf" && !hasMeaningfulExtractedText(extractedText);
}

export function sourceBackedServiceAddresses(input: {
  serviceAddress?: string | null;
  contractDetails?: { serviceAddresses?: string[] | null } | null;
}): Array<{ address: string; sourceField: string }> {
  const candidates = [
    ...(typeof input.serviceAddress === "string" && input.serviceAddress.trim()
      ? [{ address: input.serviceAddress.trim(), sourceField: "serviceAddress" }]
      : []),
    ...(input.contractDetails?.serviceAddresses ?? []).flatMap((address, index) =>
      typeof address === "string" && address.trim()
        ? [{ address: address.trim(), sourceField: `contractDetails.serviceAddresses[${index}]` }]
        : [],
    ),
  ];
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const normalized = normalizeAddress(candidate.address);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export async function persistSourceBackedServiceLocations(input: {
  db: DatabaseClient;
  organizationId: string;
  documentId: string;
  sources: Array<{ address: string; sourceField: string }>;
  workspaceCustomerMatchStatus?: IdentityMatchStatus;
  locations: Array<Record<string, unknown>>;
}): Promise<{
  locationIds: string[];
  resolutions: Array<{
    address: string;
    sourceField: string;
    resolution: DetectedServiceLocationResolution;
  }>;
}> {
  const workingLocations = [...input.locations];
  const locationIds: string[] = [];
  const resolutions: Array<{
    address: string;
    sourceField: string;
    resolution: DetectedServiceLocationResolution;
  }> = [];

  for (const source of input.sources) {
    const resolution = await persistDetectedServiceLocation({
      db: input.db,
      organizationId: input.organizationId,
      documentId: input.documentId,
      serviceAddress: source.address,
      workspaceCustomerMatchStatus: input.workspaceCustomerMatchStatus,
      locations: workingLocations,
      sourceField: source.sourceField,
    });
    resolutions.push({ ...source, resolution });
    if (resolution.locationId && !locationIds.includes(resolution.locationId)) {
      locationIds.push(resolution.locationId);
    }
    if (resolution.createdLocationId) {
      workingLocations.push({
        id: resolution.createdLocationId,
        name: source.address,
        address: source.address,
      });
    }
  }

  return { locationIds, resolutions };
}

type DatabaseClient = ReturnType<typeof createServerSupabaseClient>;

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
  malwareScan: MalwareScanResult;
  requestId?: string;
}) {
  if (!DOCUMENT_MIME_TYPES.has(input.mimeType)) throw new Error("Unsupported document type.");
  if (!input.buffer.length || input.buffer.length > MAX_DOCUMENT_SIZE) throw new Error("Document size is outside the supported range.");
  if (input.malwareScan.status !== "clean") {
    throw new Error("A document cannot enter extraction until malware scanning reports it clean.");
  }

  const sha256 = createHash("sha256").update(input.buffer).digest("hex");
  const { data: duplicate, error: duplicateError } = await input.db.from("documents").select("id,original_filename").eq("organization_id", input.organizationId).eq("sha256", sha256).maybeSingle();
  if (duplicateError) throw duplicateError;
  if (duplicate) {
    await persistDocumentSecurityScan({
      db: input.db,
      organizationId: input.organizationId,
      documentId: duplicate.id as string,
      sha256,
      sourceType: "duplicate_detection",
      scan: input.malwareScan,
    });
    return { duplicate: true as const, documentId: duplicate.id as string, originalFilename: duplicate.original_filename as string, sha256 };
  }

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
  await persistDocumentSecurityScan({
    db: input.db,
    organizationId: input.organizationId,
    documentId: document.id as string,
    sha256,
    sourceType: input.sourceType ?? (input.actorType === "service" ? "email_forwarding" : "manual_upload"),
    scan: input.malwareScan,
  });
  return processDocumentBuffer({
    db: input.db,
    documentId: document.id as string,
    organizationId: input.organizationId,
    actorId: input.actorId,
    actorType: input.actorType,
    filename: input.filename,
    mimeType: input.mimeType,
    buffer: input.buffer,
    organizationVendorId: input.organizationVendorId,
    sourceType: input.sourceType,
    auditAction: input.auditAction,
    sha256,
    requestId: input.requestId,
  });
}

export async function processDocumentBuffer(input: {
  db: DatabaseClient;
  documentId: string;
  organizationId: string;
  actorId?: string | null;
  actorType: "user" | "service";
  filename: string;
  mimeType: string;
  buffer: Buffer;
  organizationVendorId?: string | null;
  sourceType?: "manual_upload" | "email_forwarding" | "provider_integration";
  auditAction: string;
  sha256: string;
  requestId?: string;
}) {
  const { error: processingError } = await input.db
    .from("documents")
    .update({ status: "processing", extraction_summary: null, updated_at: new Date().toISOString() })
    .eq("id", input.documentId)
    .eq("organization_id", input.organizationId);
  if (processingError) throw processingError;

  let extracted = { text: "", pageCount: null as number | null };
  let inputMode: DocumentExtractionInputMode = "native_text";
  let intelligence;
  let extractionTrace: GovernedAgentTrace | null = null;
  try {
    try {
      extracted = await extractDocumentText(input.buffer, input.mimeType);
    } catch (error) {
      if (input.mimeType !== "application/pdf") throw error;
      // A valid image-only PDF can fail native text parsing. The bounded OCR
      // path is the recovery mechanism; its output is still schema-validated.
      extracted = { text: "", pageCount: null };
    }
    const hasNativeText = hasMeaningfulExtractedText(extracted.text);
    const usedPdfOcr = shouldUsePdfOcr(input.mimeType, extracted.text);
    const isImage = input.mimeType === "image/png" || input.mimeType === "image/jpeg";
    const imageMimeType = input.mimeType === "image/png" || input.mimeType === "image/jpeg" ? input.mimeType : null;
    inputMode = isImage ? "image_vision" : usedPdfOcr ? "pdf_ocr" : "native_text";
    if (!hasNativeText && !usedPdfOcr && !isImage) throw new Error("No readable text was found in this document.");
    const extractionRun = await runDocumentExtractionAgent({
      organizationId: input.organizationId,
      documentId: input.documentId,
      documentName: input.filename,
      mimeType: isImage ? imageMimeType! : input.mimeType,
      inputMode,
      extractedText: extracted.text,
      pageCount: extracted.pageCount,
      buffer: input.buffer,
      traceId: input.requestId,
    });
    intelligence = extractionRun.output;
    extractionTrace = extractionRun.trace;
  } catch (analysisError) {
    extractionTrace = agentTraceFromError(analysisError) ?? extractionTrace;
    const failureCode = classifyDocumentExtractionFailure(analysisError, inputMode);
    const summary = documentExtractionReviewSummary(failureCode);
    const { error: failureVersionError } = await input.db.from("document_extraction_versions").insert({
      document_id: input.documentId,
      extractor_version: "costivra-intake-v3",
      provider: inputMode === "pdf_ocr" ? "openrouter-pdf-ocr" : inputMode === "image_vision" ? "openrouter-image-vision" : "openrouter",
      model_identifier: process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini",
      schema_version: "cost-document-v2",
      status: "failed",
      input_mode: inputMode,
      failure_code: failureCode,
      error_message: safeExtractionError(analysisError),
      completed_at: new Date().toISOString(),
    });
    if (failureVersionError) throw failureVersionError;
    const { error: failureUpdateError } = await input.db.from("documents").update({ status: "needs_review", extraction_summary: summary, updated_at: new Date().toISOString() }).eq("id", input.documentId).eq("organization_id", input.organizationId);
    if (failureUpdateError) throw failureUpdateError;
    const { error: failureAuditError } = await input.db.from("audit_events").insert({
      organization_id: input.organizationId,
      actor_type: input.actorType,
      actor_id: input.actorId || null,
      action: input.auditAction,
      resource_type: "document",
      resource_id: input.documentId,
      safe_metadata: {
        ...(input.requestId ? { request_id: input.requestId } : {}),
        governed_agents: safeAgentTraceMetadata([extractionTrace]),
      },
    });
    if (failureAuditError) throw failureAuditError;
    return { duplicate: false as const, documentId: input.documentId, status: "needs_review" as const, warning: summary, failureCode, sha256: input.sha256 };
  }

  // Persistence is deliberately outside the extraction catch. A database or
  // audit failure must fail the request; it is not a document-quality issue.
  {
    const candidateEvidenceRows = intelligence.evidence.map((evidence) => ({
      document_id: input.documentId,
      // The evidence table requires a page number. If a scanned document has
      // no trustworthy marker, omit that reference and route the record to
      // review instead of inventing a page.
      page_number: evidencePageNumber(inputMode, extracted.pageCount, evidence.pageNumber),
      text_excerpt: evidence.quote,
      field_path: evidence.field,
      source_key: evidence.sourceKey ?? null,
    }));
    const evidenceRows = candidateEvidenceRows.filter((row) => row.page_number !== null);
    const omittedEvidenceCount = candidateEvidenceRows.length - evidenceRows.length;
    const { data: version, error: versionError } = await input.db.from("document_extraction_versions").insert({
      document_id: input.documentId,
      extractor_version: "costivra-intake-v3",
      provider: inputMode === "pdf_ocr" ? "openrouter-pdf-ocr" : inputMode === "image_vision" ? "openrouter-image-vision" : "openrouter",
      model_identifier: process.env.OPENROUTER_MODEL ?? "openai/gpt-4.1-mini",
      schema_version: "cost-document-v2",
      status: intelligence.confidence < .75 || omittedEvidenceCount > 0 ? "needs_review" : "completed",
      input_mode: inputMode,
      failure_code: null,
      structured_output: intelligence,
      confidence: intelligence.confidence,
      completed_at: new Date().toISOString(),
    }).select("id").single();
    if (versionError) throw versionError;
    let evidenceReferences: Array<{ id: string; fieldPath: string | null; sourceKey: string | null }> = [];
    if (evidenceRows.length) {
      const { data: insertedEvidence, error: evidenceError } = await input.db
        .from("evidence_references")
        .insert(evidenceRows)
        .select("id,field_path,source_key");
      if (evidenceError) throw evidenceError;
      evidenceReferences = (insertedEvidence ?? []).map((evidence) => ({
        id: String(evidence.id),
        fieldPath: typeof evidence.field_path === "string" ? evidence.field_path : null,
        sourceKey: typeof evidence.source_key === "string" ? evidence.source_key : null,
      }));
    }
    const sourceBackedAddresses = sourceBackedServiceAddresses(intelligence);
    let contractLocationPersistence: Awaited<ReturnType<typeof persistSourceBackedServiceLocations>> = {
      locationIds: [],
      resolutions: [],
    };
    const isContractDocument = intelligence.classification === "contract" || intelligence.classification === "order_form";
    if (isContractDocument && sourceBackedAddresses.length > 0) {
      const { data: locations, error: locationsError } = await input.db
        .from("locations")
        .select("id,name,address")
        .eq("organization_id", input.organizationId);
      if (locationsError) throw locationsError;
      let workspaceCustomerMatchStatus;
      if (intelligence.customerName) {
        const { data: organization, error: organizationError } = await input.db
          .from("organizations")
          .select("name,legal_name")
          .eq("id", input.organizationId)
          .maybeSingle();
        if (organizationError) throw organizationError;
        workspaceCustomerMatchStatus = resolveWorkspaceCustomer(
          intelligence.customerName,
          [organization?.name, organization?.legal_name].filter(
            (value): value is string => typeof value === "string",
          ),
        );
      }
      contractLocationPersistence = await persistSourceBackedServiceLocations({
        db: input.db,
        organizationId: input.organizationId,
        documentId: input.documentId,
        sources: sourceBackedAddresses,
        workspaceCustomerMatchStatus,
        locations: Array.isArray(locations) ? locations as Record<string, unknown>[] : [],
      });
    }
    const invoiceRecord = await createInvoiceRecordFromExtraction({
      db: input.db,
      organizationId: input.organizationId,
      documentId: input.documentId,
      extractionVersionId: version.id,
      providedRelationshipId: input.organizationVendorId,
      sourceType: input.sourceType ?? (input.actorType === "service" ? "email_forwarding" : "manual_upload"),
      intelligence,
      evidenceReferences,
    });
    const contractRecord = await createContractRecordFromExtraction({
      db: input.db,
      organizationId: input.organizationId,
      documentId: input.documentId,
      filename: input.filename,
      providedRelationshipId: input.organizationVendorId,
      intelligence,
      locationIds: contractLocationPersistence.locationIds,
      locationResolutions: contractLocationPersistence.resolutions,
    });
    const dataQualityRun = await runDocumentDataQualityAgent({
      organizationId: input.organizationId,
      documentId: input.documentId,
      traceId: input.requestId ? `${input.requestId}:quality` : undefined,
      assessmentInput: {
        classification: intelligence.classification,
        confidence: intelligence.confidence,
        omittedEvidenceCount,
        evidenceReferenceCount: evidenceReferences.length,
        invoiceRecord,
        contractRecord,
      },
    });
    const finalStatus = dataQualityRun.output.requiresReview ? "needs_review" : "ready";
    const { error: documentUpdateError } = await input.db.from("documents").update({ page_count: extracted.pageCount, document_type: intelligence.classification, extraction_summary: intelligence.summary, status: finalStatus, updated_at: new Date().toISOString() }).eq("id", input.documentId).eq("organization_id", input.organizationId);
    if (documentUpdateError) throw documentUpdateError;
    const { error: auditError } = await input.db.from("audit_events").insert({
      organization_id: input.organizationId,
      actor_type: input.actorType,
      actor_id: input.actorId || null,
      action: input.auditAction,
      resource_type: "document",
      resource_id: input.documentId,
      safe_metadata: {
        ...(input.requestId ? { request_id: input.requestId } : {}),
        governed_agents: safeAgentTraceMetadata([extractionTrace, dataQualityRun.trace]),
        data_quality_issue_codes: dataQualityRun.output.issueCodes,
      },
    });
    if (auditError) throw auditError;
    return { duplicate: false as const, documentId: input.documentId, extractionVersionId: version.id as string, invoiceRecord, contractRecord, status: finalStatus, sha256: input.sha256 };
  }
}
