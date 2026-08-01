import { NextResponse } from "next/server";
import { apiError, cleanText, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, organizationId, userId, role } = await requirePortalContext();
    if (!['owner', 'admin'].includes(role)) return NextResponse.json({ error: "An owner or administrator must verify savings." }, { status: 403 });
    const id = cleanUuid((await params).id);
    if (!id) return NextResponse.json({ error: "Invalid savings record." }, { status: 400 });
    const body = await request.json() as Record<string, unknown>;
    const operation = cleanText(body.operation, 30);
    const reason = cleanText(body.reason, 1000);
    const { data: outcome, error: outcomeError } = await db.from("savings_outcomes")
      .select("id,opportunity_id,status,baseline_expense_id,comparison_expense_id,method_version,amount")
      .eq("id", id).eq("organization_id", organizationId).maybeSingle();
    if (outcomeError) throw outcomeError;
    if (!outcome) return NextResponse.json({ error: "Savings record not found." }, { status: 404 });

    if (operation === "accept_baseline") {
      if (outcome.status !== "baseline_review" || !outcome.baseline_expense_id) {
        return NextResponse.json({ error: "This baseline is not awaiting acceptance." }, { status: 409 });
      }
      const { error } = await db.from("savings_outcomes").update({
        status: "evidence_pending",
        baseline_accepted_by: userId,
        baseline_accepted_at: new Date().toISOString(),
        method: "Annualized comparison of accepted baseline and later approved invoice",
      }).eq("id", id).eq("organization_id", organizationId).eq("status", "baseline_review");
      if (error) throw error;
    } else if (operation === "verify") {
      if (outcome.status !== "ready_for_review" || !outcome.baseline_expense_id || !outcome.comparison_expense_id || !outcome.method_version || Number(outcome.amount) <= 0) {
        return NextResponse.json({ error: "A later approved invoice and complete calculation are required before verification." }, { status: 409 });
      }
      const now = new Date().toISOString();
      const { error } = await db.from("savings_outcomes").update({ status: "verified", verified_by: userId, verified_at: now }).eq("id", id).eq("organization_id", organizationId).eq("status", "ready_for_review");
      if (error) throw error;
      if (outcome.opportunity_id) await db.from("opportunities").update({ status: "verified", updated_at: now }).eq("id", outcome.opportunity_id).eq("organization_id", organizationId);
    } else if (operation === "reject") {
      if (!['baseline_review', 'ready_for_review'].includes(outcome.status)) return NextResponse.json({ error: "This record is not awaiting a decision." }, { status: 409 });
      if (reason.length < 3) return NextResponse.json({ error: "Explain why the baseline or result is being rejected." }, { status: 400 });
      const { error } = await db.from("savings_outcomes").update({ status: "rejected", rejected_by: userId, rejected_at: new Date().toISOString(), rejection_reason: reason }).eq("id", id).eq("organization_id", organizationId);
      if (error) throw error;
    } else return NextResponse.json({ error: "Unsupported savings operation." }, { status: 400 });

    await db.from("audit_events").insert({ organization_id: organizationId, actor_type: "user", actor_id: userId, action: `savings.${operation}`, resource_type: "savings_outcome", resource_id: id });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
