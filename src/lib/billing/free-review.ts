import "server-only";

import { createHash } from "node:crypto";
import type { createServerSupabaseClient } from "@/lib/supabase/server";

export const FREE_REVIEW_LIMIT = 3;

type BillingDb = ReturnType<typeof createServerSupabaseClient>;

type FreeReviewRpcRow = {
  allowed?: boolean;
  claim_id?: string | null;
  current_usage?: number | null;
  limit_value?: number | null;
  reason?: string | null;
  is_new_claim?: boolean | null;
};

export type FreeReviewStatus = {
  mode: "free" | "paid";
  hasPaidAccess: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
};

export type FreeReviewClaim = {
  allowed: boolean;
  claimId: string | null;
  currentUsage: number;
  limit: number;
  reason: string;
  isNewClaim: boolean;
};

export type FreeReviewBufferClaim = {
  sha256: string;
  status: FreeReviewStatus;
  claim: FreeReviewClaim | null;
};

function missingDatabaseObject(error: { code?: string } | null | undefined) {
  return error?.code === "42P01" || error?.code === "42883";
}

async function hasPaidAccess(db: BillingDb, organizationId: string) {
  const { data, error } = await db
    .from("billing_subscriptions")
    .select("status")
    .eq("organization_id", organizationId)
    .in("status", ["active", "trialing"])
    .limit(1);
  if (missingDatabaseObject(error)) return false;
  if (error) throw error;
  return (data ?? []).some((row) => row.status === "active" || row.status === "trialing");
}

async function documentUsageFallback(db: BillingDb, organizationId: string) {
  const { count, error } = await db
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .neq("status", "rejected");
  if (error) throw error;
  return count ?? 0;
}

export async function getFreeReviewStatus(db: BillingDb, organizationId: string): Promise<FreeReviewStatus> {
  const paid = await hasPaidAccess(db, organizationId);
  if (paid) return { mode: "paid", hasPaidAccess: true, used: 0, limit: null, remaining: null };

  const { count, error } = await db
    .from("free_review_slots")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .in("status", ["reserved", "consumed"]);
  let used: number;
  if (missingDatabaseObject(error)) used = await documentUsageFallback(db, organizationId);
  else if (error) throw error;
  else used = count ?? 0;
  return { mode: "free", hasPaidAccess: false, used, limit: FREE_REVIEW_LIMIT, remaining: Math.max(FREE_REVIEW_LIMIT - used, 0) };
}

export async function hasPaidWorkspace(db: BillingDb, organizationId: string): Promise<boolean> {
  return (await getFreeReviewStatus(db, organizationId)).mode === "paid";
}

export async function claimFreeReviewSlot(db: BillingDb, organizationId: string, sha256: string): Promise<FreeReviewClaim> {
  const { data, error } = await db.rpc("claim_free_review_slot", {
    p_organization_id: organizationId,
    p_sha256: sha256,
    p_limit: FREE_REVIEW_LIMIT,
  });
  if (missingDatabaseObject(error)) {
    const used = await documentUsageFallback(db, organizationId);
    return { allowed: used < FREE_REVIEW_LIMIT, claimId: null, currentUsage: used, limit: FREE_REVIEW_LIMIT, reason: used < FREE_REVIEW_LIMIT ? "legacy_fallback" : "limit_reached", isNewClaim: false };
  }
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as FreeReviewRpcRow | null;
  const currentUsage = Number(row?.current_usage ?? 0);
  return {
    allowed: row?.allowed === true,
    claimId: typeof row?.claim_id === "string" ? row.claim_id : null,
    currentUsage,
    limit: Number(row?.limit_value ?? FREE_REVIEW_LIMIT),
    reason: typeof row?.reason === "string" ? row.reason : "unknown",
    isNewClaim: row?.is_new_claim === true,
  };
}

/**
 * Prepare one document for intake. The hash makes retries idempotent, while
 * the database RPC makes the three-document limit safe under concurrent uploads.
 */
export async function prepareFreeReviewBufferClaim(
  db: BillingDb,
  organizationId: string,
  buffer: Buffer,
): Promise<FreeReviewBufferClaim> {
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const status = await getFreeReviewStatus(db, organizationId);
  if (status.mode === "paid") return { sha256, status, claim: null };
  return { sha256, status, claim: await claimFreeReviewSlot(db, organizationId, sha256) };
}

export async function finalizeFreeReviewSlot(db: BillingDb, claimId: string | null, status: "consumed" | "released") {
  if (!claimId) return;
  const { error } = await db.rpc("finalize_free_review_slot", {
    p_claim_id: claimId,
    p_status: status,
  });
  if (missingDatabaseObject(error)) return;
  if (error) throw error;
}
