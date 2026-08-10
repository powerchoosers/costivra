import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeEmailAddress } from "@/lib/manage/mail";
import {
  addOutreachSuppression,
  stopEnrollmentForReason,
} from "@/lib/manage/sequences/lifecycle";

type Db = ReturnType<typeof createServerSupabaseClient>;

export function hashUnsubscribeToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function publicBaseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://costivra.ai").replace(/\/$/, "");
}

export async function createSequenceUnsubscribeToken(
  db: Db,
  input: { contactId: string; organizationId: string; sequenceId: string; email: string },
) {
  const raw = randomBytes(32).toString("base64url");
  const email = normalizeEmailAddress(input.email);
  const { error } = await db.from("crm_outreach_unsubscribe_tokens").insert({
    token_hash: hashUnsubscribeToken(raw),
    contact_id: input.contactId,
    organization_id: input.organizationId,
    sequence_id: input.sequenceId,
    email_normalized: email,
  });
  if (error) throw error;
  return `${publicBaseUrl()}/api/outreach/unsubscribe?token=${encodeURIComponent(raw)}`;
}

export async function processSequenceUnsubscribe(db: Db, token: string) {
  const clean = token.trim();
  if (!clean || clean.length < 20) return { status: "invalid" as const };
  const { data: record, error } = await db
    .from("crm_outreach_unsubscribe_tokens")
    .select("id,contact_id,organization_id,sequence_id,email_normalized,used_at,revoked_at,expires_at")
    .eq("token_hash", hashUnsubscribeToken(clean))
    .maybeSingle();
  if (error) throw error;
  if (!record) return { status: "invalid" as const };
  if (record.revoked_at || (record.expires_at && new Date(record.expires_at).getTime() <= Date.now())) {
    return { status: "expired" as const };
  }
  if (record.used_at) return { status: "idempotent" as const, stopped: 0 };

  await addOutreachSuppression(db, {
    email: record.email_normalized,
    reason: "unsubscribed",
    source: "sequence_unsubscribe",
  });
  await db.from("crm_contacts").update({ status: "unsubscribed", updated_at: new Date().toISOString() })
    .eq("id", record.contact_id).eq("organization_id", record.organization_id);

  const { data: enrollments, error: enrollmentError } = await db
    .from("crm_sequence_enrollments")
    .select("id")
    .eq("contact_id", record.contact_id)
    .in("state", ["pending", "active", "paused", "waiting_for_task"]);
  if (enrollmentError) throw enrollmentError;
  let stopped = 0;
  for (const enrollment of enrollments ?? []) {
    if (await stopEnrollmentForReason(db, {
      enrollmentId: enrollment.id,
      reason: "unsubscribe",
      eventType: "unsubscribed",
      safeMetadata: { source: "public_unsubscribe" },
    })) stopped += 1;
  }
  await db.from("crm_outreach_unsubscribe_tokens").update({ used_at: new Date().toISOString() }).eq("id", record.id).is("used_at", null);
  await db.from("internal_audit_events").insert({
    organization_id: record.organization_id,
    action: "crm.sequence_unsubscribed",
    resource_type: "crm_contact",
    resource_id: record.contact_id,
    safe_metadata: { source: "public_unsubscribe", stopped_enrollments: stopped },
  });
  return { status: "applied" as const, stopped };
}
