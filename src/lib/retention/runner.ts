import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  retentionCutoff,
  retentionPolicyFromEnvironment,
  type RetentionPolicy,
} from "@/lib/retention/policy";

type RetainedDocument = {
  id: string;
  storage_path: string;
  status: string;
};

type RetainedAttachment = {
  id: string;
  quarantine_storage_path: string;
};

type RetentionCounts = {
  quarantinedDocuments: number;
  quarantinedAttachments: number;
  originalDocuments: number;
};

type RetentionFailure = {
  category: keyof RetentionCounts | "run";
  code: string;
};

export type RetentionRunResult = {
  id: string;
  mode: "report" | "enforce";
  status: "completed" | "completed_with_errors";
  candidates: RetentionCounts;
  purged: RetentionCounts;
  failures: RetentionFailure[];
};

const emptyCounts = (): RetentionCounts => ({
  quarantinedDocuments: 0,
  quarantinedAttachments: 0,
  originalDocuments: 0,
});

function heldAfter(now: string) {
  return `retention_hold_until.is.null,retention_hold_until.lt.${now}`;
}

async function findDocumentCandidates(
  db: SupabaseClient,
  input: {
    cutoff: string;
    now: string;
    statuses: string[];
    limit: number;
  },
) {
  const result = await db
    .from("documents")
    .select("id,storage_path,status")
    .is("source_purged_at", null)
    .in("status", input.statuses)
    .lt("created_at", input.cutoff)
    .or(heldAfter(input.now))
    .order("created_at", { ascending: true })
    .limit(input.limit);
  if (result.error) throw new Error("RETENTION_DOCUMENT_QUERY_FAILED");
  return (result.data ?? []) as RetainedDocument[];
}

async function findAttachmentCandidates(
  db: SupabaseClient,
  input: { cutoff: string; now: string; limit: number },
) {
  const result = await db
    .from("inbound_email_attachments")
    .select("id,quarantine_storage_path")
    .not("quarantine_storage_path", "is", null)
    .is("quarantine_purged_at", null)
    .lt("created_at", input.cutoff)
    .or(heldAfter(input.now))
    .order("created_at", { ascending: true })
    .limit(input.limit);
  if (result.error) throw new Error("RETENTION_ATTACHMENT_QUERY_FAILED");
  return (result.data ?? []).filter(
    (row): row is RetainedAttachment =>
      typeof row.id === "string" &&
      typeof row.quarantine_storage_path === "string" &&
      Boolean(row.quarantine_storage_path),
  );
}

async function removeDocumentFiles(
  db: SupabaseClient,
  rows: RetainedDocument[],
  now: string,
) {
  if (!rows.length) return;
  const removed = await db.storage
    .from("costivra-documents")
    .remove(rows.map((row) => row.storage_path));
  if (removed.error) throw new Error("RETENTION_STORAGE_DELETE_FAILED");
  const updated = await db
    .from("documents")
    .update({ source_purged_at: now, updated_at: now })
    .in("id", rows.map((row) => row.id));
  if (updated.error) throw new Error("RETENTION_DOCUMENT_MARK_FAILED");
}

async function removeQuarantineAttachments(
  db: SupabaseClient,
  rows: RetainedAttachment[],
  now: string,
) {
  if (!rows.length) return;
  const removed = await db.storage
    .from("costivra-documents")
    .remove(rows.map((row) => row.quarantine_storage_path));
  if (removed.error) throw new Error("RETENTION_STORAGE_DELETE_FAILED");
  const updated = await db
    .from("inbound_email_attachments")
    .update({
      quarantine_storage_path: null,
      quarantine_purged_at: now,
      updated_at: now,
    })
    .in("id", rows.map((row) => row.id));
  if (updated.error) throw new Error("RETENTION_ATTACHMENT_MARK_FAILED");
}

function safeFailure(
  category: RetentionFailure["category"],
  error: unknown,
): RetentionFailure {
  const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
    ? error.message
    : "RETENTION_OPERATION_FAILED";
  return { category, code };
}

export async function runRetention(
  db: SupabaseClient,
  options: { now?: Date; policy?: RetentionPolicy } = {},
): Promise<RetentionRunResult> {
  const nowDate = options.now ?? new Date();
  const now = nowDate.toISOString();
  const policy = options.policy ?? retentionPolicyFromEnvironment();
  const mode = policy.enforce ? "enforce" : "report";
  const { data: run, error: runError } = await db
    .from("retention_runs")
    .insert({ mode, policy })
    .select("id")
    .single();
  if (runError || !run?.id) throw new Error("RETENTION_RUN_CREATE_FAILED");

  const candidates = emptyCounts();
  const purged = emptyCounts();
  const failures: RetentionFailure[] = [];
  try {
    const [quarantinedDocuments, quarantinedAttachments, originalDocuments] =
      await Promise.all([
        findDocumentCandidates(db, {
          cutoff: retentionCutoff(policy.quarantineDays, nowDate),
          now,
          statuses: ["quarantined", "rejected"],
          limit: policy.batchSize,
        }),
        findAttachmentCandidates(db, {
          cutoff: retentionCutoff(policy.quarantineDays, nowDate),
          now,
          limit: policy.batchSize,
        }),
        policy.originalDays
          ? findDocumentCandidates(db, {
              cutoff: retentionCutoff(policy.originalDays, nowDate),
              now,
              statuses: ["ready", "needs_review"],
              limit: policy.batchSize,
            })
          : Promise.resolve([]),
      ]);
    candidates.quarantinedDocuments = quarantinedDocuments.length;
    candidates.quarantinedAttachments = quarantinedAttachments.length;
    candidates.originalDocuments = originalDocuments.length;

    if (policy.enforce) {
      for (const operation of [
        {
          category: "quarantinedDocuments" as const,
          rows: quarantinedDocuments,
          execute: () => removeDocumentFiles(db, quarantinedDocuments, now),
        },
        {
          category: "quarantinedAttachments" as const,
          rows: quarantinedAttachments,
          execute: () => removeQuarantineAttachments(db, quarantinedAttachments, now),
        },
        {
          category: "originalDocuments" as const,
          rows: originalDocuments,
          execute: () => removeDocumentFiles(db, originalDocuments, now),
        },
      ]) {
        try {
          await operation.execute();
          purged[operation.category] = operation.rows.length;
        } catch (error) {
          failures.push(safeFailure(operation.category, error));
        }
      }
    }
  } catch (error) {
    failures.push(safeFailure("run", error));
  }

  const status = failures.length ? "completed_with_errors" : "completed";
  const finalized = await db
    .from("retention_runs")
    .update({ status, candidates, purged, failures, completed_at: now })
    .eq("id", run.id);
  if (finalized.error) throw new Error("RETENTION_RUN_FINALIZE_FAILED");
  return { id: run.id, mode, status, candidates, purged, failures };
}
