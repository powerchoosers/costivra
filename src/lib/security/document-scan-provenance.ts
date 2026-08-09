import "server-only";

import type { MalwareScanResult } from "@/lib/security/malware-scanner-core";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type DatabaseClient = ReturnType<typeof createServerSupabaseClient>;

export type DocumentScanSourceType =
  | "manual_upload"
  | "email_forwarding"
  | "provider_integration"
  | "quarantine_rescan"
  | "duplicate_detection";

function safeCode(scan: MalwareScanResult) {
  return scan.code ?? scan.status;
}

/**
 * Persist only the safe, structured scan outcome. This uses the server-only
 * client and the database trigger updates the document snapshot atomically.
 */
export async function persistDocumentSecurityScan(input: {
  db: DatabaseClient;
  organizationId: string;
  documentId: string | null;
  sha256: string;
  sourceType: DocumentScanSourceType;
  scan: MalwareScanResult;
  startedAt?: string;
  completedAt?: string;
}) {
  const completedAt = input.completedAt ?? new Date().toISOString();
  const startedAt = input.startedAt ?? completedAt;
  const { error } = await input.db
    .from("document_security_scan_attempts")
    .insert({
      organization_id: input.organizationId,
      document_id: input.documentId,
      sha256: input.sha256,
      source_type: input.sourceType,
      provider: input.scan.provider ?? "unavailable",
      status: input.scan.status,
      safe_code: safeCode(input.scan),
      provider_http_status: input.scan.providerHttpStatus ?? null,
      started_at: startedAt,
      completed_at: completedAt,
    });

  if (error) throw error;
}
