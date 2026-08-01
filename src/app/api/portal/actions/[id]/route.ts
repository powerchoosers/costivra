import { NextResponse } from "next/server";
import { actionMayStart, canTransitionAction } from "@/lib/domain/workflow-policy";
import { SAVINGS_METHOD_VERSION } from "@/lib/domain/value-engine";
import { apiError, cleanText, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, organizationId, userId, role } = await requirePortalContext();
    if (!['owner', 'admin'].includes(role)) return NextResponse.json({ error: "An owner or administrator must authorize this action." }, { status: 403 });
    const id = cleanUuid((await params).id);
    if (!id) return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    const body = await request.json() as Record<string, unknown>;
    const operation = cleanText(body.operation, 30);
    const { data: action, error: actionError } = await db.from("action_plans")
      .select("id,opportunity_id,status").eq("id", id).maybeSingle();
    if (actionError) throw actionError;
    if (!action) return NextResponse.json({ error: "Action not found." }, { status: 404 });
    const { data: opportunity, error: opportunityError } = await db.from("opportunities")
      .select("id,organization_id,type,title,source_expense_id,currency")
      .eq("id", action.opportunity_id).eq("organization_id", organizationId).maybeSingle();
    if (opportunityError) throw opportunityError;
    if (!opportunity) return NextResponse.json({ error: "Action not found." }, { status: 404 });

    if (operation === "approve" || operation === "decline") {
      const nextStatus = operation === "approve" ? "approved" : "cancelled";
      if (!canTransitionAction(action.status, nextStatus)) return invalidTransition(action.status, nextStatus);
      const { data: approval, error: approvalLookupError } = await db.from("approvals")
        .select("id").eq("resource_type", "action_plan").eq("resource_id", id)
        .eq("requested_from", userId).eq("decision", "pending").maybeSingle();
      if (approvalLookupError) throw approvalLookupError;
      if (!approval) return NextResponse.json({ error: "This approval is not assigned to you or has already been decided." }, { status: 409 });
      const decision = operation === "approve" ? "approved" : "declined";
      const { error: approvalError } = await db.from("approvals").update({ decision, decision_reason: cleanText(body.reason, 500) || null, decided_at: new Date().toISOString() }).eq("id", approval.id).eq("decision", "pending");
      if (approvalError) throw approvalError;
      const { error: actionUpdateError } = await db.from("action_plans").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", id).eq("status", action.status);
      if (actionUpdateError) throw actionUpdateError;
      if (operation === "decline") {
        await db.from("opportunities").update({ status: "declined", updated_at: new Date().toISOString() }).eq("id", opportunity.id);
      } else if (opportunity.type !== "energy_review" && opportunity.source_expense_id) {
        const { data: baseline, error: baselineError } = await db.from("expenses")
          .select("id,amount,currency").eq("id", opportunity.source_expense_id).eq("organization_id", organizationId).maybeSingle();
        if (baselineError) throw baselineError;
        if (baseline) {
          const { error: savingsError } = await db.from("savings_outcomes").upsert({
            organization_id: organizationId,
            opportunity_id: opportunity.id,
            title: `Verify outcome: ${opportunity.title}`,
            value_type: "annual_savings",
            amount: "0.00",
            currency: baseline.currency,
            method: "Baseline awaiting customer acceptance",
            method_version: SAVINGS_METHOD_VERSION,
            status: "baseline_review",
            baseline_expense_id: baseline.id,
            baseline_amount: baseline.amount,
            calculation_inputs: { baselineExpenseId: baseline.id, baselineAmount: String(baseline.amount), currency: baseline.currency },
            assumptions: ["The accepted invoice represents the recurring pre-action cost."],
          }, { onConflict: "opportunity_id" });
          if (savingsError) throw savingsError;
        }
      }
    } else if (operation === "start") {
      if (!canTransitionAction(action.status, "in_progress")) return invalidTransition(action.status, "in_progress");
      const { data: savings, error: savingsError } = await db.from("savings_outcomes")
        .select("status").eq("opportunity_id", opportunity.id).maybeSingle();
      if (savingsError) throw savingsError;
      if (!actionMayStart({ opportunityType: opportunity.type, savingsStatus: savings?.status ?? null })) {
        return NextResponse.json({ error: "Accept the savings baseline before starting this work." }, { status: 409 });
      }
      await db.from("action_plans").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", id).eq("status", action.status);
      await db.from("opportunities").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", opportunity.id);
    } else if (operation === "complete") {
      if (!canTransitionAction(action.status, "complete")) return invalidTransition(action.status, "complete");
      await db.from("action_plans").update({ status: "complete", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("status", action.status);
    } else return NextResponse.json({ error: "Unsupported action." }, { status: 400 });

    await db.from("audit_events").insert({ organization_id: organizationId, actor_type: "user", actor_id: userId, action: `action_plan.${operation}`, resource_type: "action_plan", resource_id: id });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}

function invalidTransition(current: string, next: string) {
  return NextResponse.json({ error: `This action cannot move from ${current.replaceAll('_', ' ')} to ${next.replaceAll('_', ' ')}.` }, { status: 409 });
}
