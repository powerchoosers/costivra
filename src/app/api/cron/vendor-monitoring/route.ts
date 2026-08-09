import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendLifecycleEmailToWorkspace } from "@/lib/email/lifecycle-recipient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Mark each overdue monitoring cycle once and notify the current workspace owners. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const db = createServerSupabaseClient();
  const now = new Date().toISOString();
  const { data: configs, error } = await db
    .from("vendor_monitoring_configs")
    .select("id,organization_id,organization_vendor_id,next_expected_at,state")
    .eq("state", "active")
    .not("next_expected_at", "is", null)
    .lte("next_expected_at", now)
    .order("next_expected_at", { ascending: true })
    .limit(50);
  if (error) return NextResponse.json({ error: "Monitoring schedules could not be loaded." }, { status: 500 });

  const results: Array<{ configId: string; status: string }> = [];
  for (const config of configs ?? []) {
    const expectedAt = typeof config.next_expected_at === "string" ? config.next_expected_at : null;
    if (!expectedAt) continue;
    const { data: claimed, error: claimError } = await db
      .from("vendor_monitoring_configs")
      .update({ state: "attention_needed", next_expected_at: null, last_failure_code: "EXPECTED_BILL_MISSED", updated_at: now })
      .eq("id", config.id)
      .eq("state", "active")
      .eq("next_expected_at", expectedAt)
      .select("id")
      .maybeSingle();
    if (claimError) {
      results.push({ configId: String(config.id), status: "failed" });
      continue;
    }
    if (!claimed) continue;

    const { data: relationship } = await db
      .from("organization_vendors")
      .select("vendor_id,display_name_override,vendors(canonical_name)")
      .eq("id", config.organization_vendor_id)
      .eq("organization_id", config.organization_id)
      .maybeSingle();
    const vendorName = typeof relationship?.display_name_override === "string" && relationship.display_name_override.trim()
      ? relationship.display_name_override
      : typeof (relationship?.vendors as unknown as { canonical_name?: unknown } | null)?.canonical_name === "string"
        ? (relationship?.vendors as unknown as { canonical_name: string }).canonical_name
        : undefined;
    try {
      await sendLifecycleEmailToWorkspace({
        db,
        kind: "expected_bill_missed",
        organizationId: String(config.organization_id),
        payload: {
          vendorName,
          eventKey: `expected-bill-missed:${config.id}:${expectedAt}`,
        },
      });
    } catch (emailError) {
      // The monitoring state remains attention_needed; the email ledger can be
      // retried by an operator without repeatedly marking the same cycle.
      console.error("expected bill missed lifecycle email failed", emailError);
    }
    await db.from("audit_events").insert({
      organization_id: config.organization_id,
      actor_type: "service",
      action: "vendor_monitoring.expected_bill_missed",
      resource_type: "vendor_monitoring_configs",
      resource_id: config.id,
      safe_metadata: { expected_at: expectedAt, state: "attention_needed" },
    });
    results.push({ configId: String(config.id), status: "attention_needed" });
  }

  return NextResponse.json({ checkedAt: now, processed: results.length, results }, { headers: { "Cache-Control": "private, no-store" } });
}
