import "server-only";

import { createHash, randomUUID } from "node:crypto";
import {
  DOCUMENT_MIME_TYPES,
  ingestDocumentBuffer,
  MAX_DOCUMENT_SIZE,
  processDocumentBuffer,
} from "@/lib/documents/intake";
import { manualUploadScanDecision } from "@/lib/documents/manual-upload-policy";
import { scanFileForMalware } from "@/lib/security/malware-scanner";
import { persistDocumentSecurityScan } from "@/lib/security/document-scan-provenance";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type DatabaseClient = ReturnType<typeof createServerSupabaseClient>;

function validateDocument(filename: string, mimeType: string, buffer: Buffer) {
  if (!DOCUMENT_MIME_TYPES.has(mimeType)) throw new Error("Unsupported document type.");
  if (!buffer.length || buffer.length > MAX_DOCUMENT_SIZE) {
    throw new Error("Document size is outside the supported range.");
  }
  return filename.replace(/[^A-Za-z0-9._-]/g, "-").slice(-180) || "document";
}

async function recordAudit(
  db: DatabaseClient,
  input: {
    organizationId: string;
    actorId: string;
    action: string;
    documentId?: string | null;
  },
) {
  const { error } = await db.from("audit_events").insert({
    organization_id: input.organizationId,
    actor_type: "user",
    actor_id: input.actorId,
    action: input.action,
    resource_type: "document",
    resource_id: input.documentId ?? null,
  });
  if (error) throw error;
}

export async function ingestManualUpload(input: {
  db: DatabaseClient;
  organizationId: string;
  actorId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  organizationVendorId?: string | null;
}) {
  const safeName = validateDocument(input.filename, input.mimeType, input.buffer);
  const sha256 = createHash("sha256").update(input.buffer).digest("hex");
  const { data: duplicate, error: duplicateError } = await input.db
    .from("documents")
    .select("id,original_filename")
    .eq("organization_id", input.organizationId)
    .eq("sha256", sha256)
    .maybeSingle();
  if (duplicateError) throw duplicateError;
  if (duplicate) {
    return {
      outcome: "duplicate" as const,
      documentId: duplicate.id as string,
      originalFilename: duplicate.original_filename as string,
      sha256,
    };
  }

  const scan = await scanFileForMalware({
    buffer: input.buffer,
    filename: input.filename,
    mimeType: input.mimeType,
  });
  const decision = manualUploadScanDecision(scan);
  if (decision.action === "reject") {
    await persistDocumentSecurityScan({
      db: input.db,
      organizationId: input.organizationId,
      documentId: null,
      sha256,
      sourceType: "manual_upload",
      scan,
    });
    await recordAudit(input.db, {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: "document.upload_rejected_malware",
    });
    return { outcome: "rejected" as const, error: decision.message };
  }
  if (decision.action === "process") {
    const result = await ingestDocumentBuffer({
      ...input,
      actorType: "user",
      sourceType: "manual_upload",
      auditAction: "document.uploaded_and_extracted",
      malwareScan: scan,
    });
    if (result.duplicate) {
      return {
        outcome: "duplicate" as const,
        documentId: result.documentId,
        originalFilename: result.originalFilename,
        sha256: result.sha256,
      };
    }
    return { outcome: "processed" as const, ...result };
  }

  const storagePath = `${input.organizationId}/quarantine/manual/${randomUUID()}-${safeName}`;
  const { data: document, error: insertError } = await input.db
    .from("documents")
    .insert({
      organization_id: input.organizationId,
      organization_vendor_id: input.organizationVendorId || null,
      storage_path: storagePath,
      original_filename: input.filename.slice(0, 255),
      mime_type: input.mimeType,
      byte_size: input.buffer.length,
      sha256,
      status: "quarantined",
      security_scan_status: scan.status,
      security_scan_safe_code: scan.code ?? scan.status,
      extraction_summary: decision.message.slice(0, 1000),
      uploaded_by: input.actorId,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;

  const upload = await input.db.storage
    .from("costivra-documents")
    .upload(storagePath, input.buffer, {
      contentType: input.mimeType,
      upsert: false,
    });
  if (upload.error) {
    await input.db.from("documents").delete().eq("id", document.id);
    throw upload.error;
  }
  await persistDocumentSecurityScan({
    db: input.db,
    organizationId: input.organizationId,
    documentId: document.id as string,
    sha256,
    sourceType: "manual_upload",
    scan,
  });
  try {
    await recordAudit(input.db, {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: "document.upload_quarantined",
      documentId: document.id,
    });
  } catch (error) {
    await input.db.storage.from("costivra-documents").remove([storagePath]);
    await input.db.from("documents").delete().eq("id", document.id);
    throw error;
  }
  return {
    outcome: "quarantined" as const,
    documentId: document.id as string,
    status: "quarantined" as const,
    warning: decision.message,
    sha256,
  };
}

export async function rescanManualUpload(input: {
  db: DatabaseClient;
  organizationId: string;
  actorId: string;
  documentId: string;
}) {
  const { data: document, error } = await input.db
    .from("documents")
    .select("id,storage_path,original_filename,mime_type,sha256,organization_vendor_id,status")
    .eq("id", input.documentId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();
  if (error) throw error;
  if (!document) return { outcome: "not_found" as const };
  if (document.status !== "quarantined") return { outcome: "not_quarantined" as const };

  const stored = await input.db.storage
    .from("costivra-documents")
    .download(document.storage_path);
  if (stored.error) throw stored.error;
  const buffer = Buffer.from(await stored.data.arrayBuffer());
  validateDocument(document.original_filename, document.mime_type, buffer);
  const actualSha256 = createHash("sha256").update(buffer).digest("hex");
  if (actualSha256 !== document.sha256) {
    throw new Error("The quarantined file no longer matches its recorded digest.");
  }

  const scan = await scanFileForMalware({
    buffer,
    filename: document.original_filename,
    mimeType: document.mime_type,
  });
  const decision = manualUploadScanDecision(scan);
  await persistDocumentSecurityScan({
    db: input.db,
    organizationId: input.organizationId,
    documentId: document.id,
    sha256: actualSha256,
    sourceType: "quarantine_rescan",
    scan,
  });
  if (decision.action === "reject") {
    const { error: updateError } = await input.db
      .from("documents")
      .update({
        status: "rejected",
        extraction_summary: decision.message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", document.id)
      .eq("organization_id", input.organizationId);
    if (updateError) throw updateError;
    await recordAudit(input.db, {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: "document.quarantine_rejected_malware",
      documentId: document.id,
    });
    const removed = await input.db.storage
      .from("costivra-documents")
      .remove([document.storage_path]);
    if (removed.error) throw removed.error;
    const { error: purgeMarkError } = await input.db
      .from("documents")
      .update({ source_purged_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", document.id)
      .eq("organization_id", input.organizationId);
    if (purgeMarkError) throw purgeMarkError;
    return { outcome: "rejected" as const, error: decision.message };
  }
  if (decision.action === "quarantine") {
    const { error: updateError } = await input.db
      .from("documents")
      .update({
        extraction_summary: decision.message.slice(0, 1000),
        updated_at: new Date().toISOString(),
      })
      .eq("id", document.id)
      .eq("organization_id", input.organizationId);
    if (updateError) throw updateError;
    await recordAudit(input.db, {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: "document.quarantine_rescan_deferred",
      documentId: document.id,
    });
    return { outcome: "quarantined" as const, warning: decision.message };
  }

  const result = await processDocumentBuffer({
    db: input.db,
    documentId: document.id,
    organizationId: input.organizationId,
    actorId: input.actorId,
    actorType: "user",
    filename: document.original_filename,
    mimeType: document.mime_type,
    buffer,
    organizationVendorId: document.organization_vendor_id,
    sourceType: "manual_upload",
    auditAction: "document.quarantine_released_and_extracted",
    sha256: actualSha256,
  });
  return { outcome: "processed" as const, ...result };
}
