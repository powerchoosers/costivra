import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { getRequestId, withRequestId } from "@/lib/observability/request-context";
import { sendLifecycleEmail } from "@/lib/email/lifecycle";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Deliver pending approval notices only to the approver recorded on the approval row. */
export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const respond = (body: unknown, init?: ResponseInit) => withRequestId(NextResponse.json(body, init), requestId);
  if (!isCronAuthorized(request)) return respond({ error: "Unauthorized." }, { status: 401 });
  const db = createServerSupabaseClient();
  const { data: approvals, error } = await db
    .from("approvals")
    .select("id,organization_id,resource_type,resource_id,requested_from,created_at")
    .eq("decision", "pending")
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) return respond({ error: "Approval notices could not be loaded." }, { status: 500 });

  const results: Array<{ approvalId: string; status: string }> = [];
  for (const approval of approvals ?? []) {
    const { data: profile } = await db.from("profiles").select("email,full_name").eq("id", approval.requested_from).maybeSingle();
    const email = typeof profile?.email === "string" ? profile.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      results.push({ approvalId: String(approval.id), status: "missing_recipient" });
      continue;
    }
    let actionTitle = "An action is waiting for approval";
    if (approval.resource_type === "action_plan") {
      const { data: action } = await db.from("action_plans").select("title").eq("id", approval.resource_id).eq("organization_id", approval.organization_id).maybeSingle();
      if (typeof action?.title === "string" && action.title.trim()) actionTitle = action.title;
    }
    try {
      const result = await sendLifecycleEmail(db, {
        kind: "approval_requested",
        organizationId: String(approval.organization_id),
        recipientEmail: email,
        recipientName: typeof profile?.full_name === "string" ? profile.full_name : undefined,
        payload: {
          actionTitle,
          sourceRecordId: String(approval.id),
          eventKey: `approval-requested:${approval.id}`,
        },
      });
      results.push({ approvalId: String(approval.id), status: result.deliveryStatus ?? "failed" });
    } catch (emailError) {
      console.error("approval lifecycle email failed", emailError);
      results.push({ approvalId: String(approval.id), status: "failed" });
    }
  }

  return respond({ processed: results.length, results }, { headers: { "Cache-Control": "private, no-store" } });
}
