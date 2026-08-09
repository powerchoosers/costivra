import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type SideEffectClaimInput = {
  organizationId: string;
  type: string;
  destination: string;
  idempotencyKey: string;
  requestHash: string;
  provider?: string;
  actorId?: string;
  authorizationMethod: string;
  sanitizedRequestMetadata?: Record<string, unknown>;
};

type SideEffectRow = {
  id: string;
  status: string;
  provider_reference?: string | null;
  request_hash?: string | null;
};

export type SideEffectClaimResult =
  | { claimed: true; id: string }
  | { claimed: false; duplicate: true; id?: string; providerReference?: string | null; status?: string }
  | { claimed: false; duplicate: false; error: string };

const completedStatuses = new Set(["sent", "accepted", "delivered"]);

/**
 * Claim a side effect before making an external call.
 *
 * INSERT is intentionally used instead of upsert: only the request that wins
 * the unique idempotency key may call the provider. Failed rows can be
 * reclaimed with a compare-and-set update; an in-flight approved row is left
 * alone so a concurrent worker cannot send it twice.
 */
export async function claimExternalSideEffect(
  db: SupabaseClient,
  input: SideEffectClaimInput,
): Promise<SideEffectClaimResult> {
  const now = new Date().toISOString();
  const insert = await db
    .from("external_side_effects")
    .insert({
      organization_id: input.organizationId,
      type: input.type,
      destination: input.destination,
      idempotency_key: input.idempotencyKey,
      request_hash: input.requestHash,
      status: "approved",
      provider: input.provider ?? "resend",
      actor_id: input.actorId ?? null,
      authorized_at: now,
      authorization_method: input.authorizationMethod,
      sanitized_request_metadata: input.sanitizedRequestMetadata ?? {},
      updated_at: now,
    })
    .select("id,status,provider_reference,request_hash")
    .single();

  if (!insert.error && insert.data) {
    return { claimed: true, id: String((insert.data as SideEffectRow).id) };
  }
  if (insert.error?.code !== "23505") {
    return { claimed: false, duplicate: false, error: "SIDE_EFFECT_CLAIM_FAILED" };
  }

  const existingResult = await db
    .from("external_side_effects")
    .select("id,status,provider_reference,request_hash")
    .eq("organization_id", input.organizationId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (existingResult.error || !existingResult.data) {
    return { claimed: false, duplicate: false, error: "SIDE_EFFECT_LOOKUP_FAILED" };
  }

  const existing = existingResult.data as SideEffectRow;
  if (existing.request_hash && existing.request_hash !== input.requestHash) {
    return { claimed: false, duplicate: false, error: "EMAIL_IDEMPOTENCY_CONTENT_MISMATCH" };
  }
  if (completedStatuses.has(existing.status)) {
    return {
      claimed: false,
      duplicate: true,
      id: existing.id,
      providerReference: existing.provider_reference,
      status: existing.status,
    };
  }

  if (existing.status === "failed") {
    const retry = await db
      .from("external_side_effects")
      .update({ status: "approved", last_error: null, updated_at: now })
      .eq("id", existing.id)
      .eq("status", "failed")
      .select("id")
      .maybeSingle();
    if (!retry.error && retry.data) {
      return { claimed: true, id: String((retry.data as { id: string }).id) };
    }
  }

  return {
    claimed: false,
    duplicate: true,
    id: existing.id,
    providerReference: existing.provider_reference,
    status: existing.status,
  };
}
