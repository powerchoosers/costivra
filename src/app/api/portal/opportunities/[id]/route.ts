import { NextResponse } from "next/server";
import { canTransitionOpportunity } from "@/lib/domain/workflow-policy";
import { apiError, cleanText, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, organizationId, userId, role } = await requirePortalContext();
    const id = cleanUuid((await params).id);
    if (!id) return NextResponse.json({ error: "Invalid opportunity." }, { status: 400 });
    if (!['owner', 'admin', 'member'].includes(role)) {
      return NextResponse.json({ error: "You do not have permission to update opportunities." }, { status: 403 });
    }
    const body = await request.json() as Record<string, unknown>;
    const status = cleanText(body.status, 30);
    const priority = cleanText(body.priority, 20);
    const { data: opportunity, error: opportunityError } = await db.from("opportunities")
      .select("id,status,title,summary,type,priority,deadline_at,source_expense_id")
      .eq("id", id).eq("organization_id", organizationId).maybeSingle();
    if (opportunityError) throw opportunityError;
    if (!opportunity) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });

    if (status && !canTransitionOpportunity(opportunity.status, status)) {
      return NextResponse.json({ error: `This opportunity cannot move from ${opportunity.status.replaceAll('_', ' ')} to ${status.replaceAll('_', ' ')}.` }, { status: 409 });
    }
    if (['approved', 'declined'].includes(status) && !['owner', 'admin'].includes(role)) {
      return NextResponse.json({ error: "An owner or administrator must make this decision." }, { status: 403 });
    }
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) update.status = status;
    if (priority && ["high", "medium", "low"].includes(priority)) update.priority = priority;
    if (Object.prototype.hasOwnProperty.call(body, "deadlineAt")) update.deadline_at = cleanText(body.deadlineAt, 40) || null;
    const { error: updateError } = await db.from("opportunities").update(update)
      .eq("id", id).eq("organization_id", organizationId);
    if (updateError) throw updateError;

    let actionId: string | null = null;
    if (status === "approved") {
      const { data: existingAction, error: existingError } = await db.from("action_plans")
        .select("id").eq("opportunity_id", id).maybeSingle();
      if (existingError) throw existingError;
      if (existingAction) actionId = existingAction.id as string;
      else {
        const { data: action, error: actionError } = await db.from("action_plans").insert({
          opportunity_id: id,
          status: "pending_approval",
          title: `Review and act on: ${opportunity.title}`,
          description: "Confirm the baseline and approve the specific internal work before any vendor communication is prepared.",
          action_type: opportunity.type === "energy_review" ? "prepare_energy_review" : "review_vendor_cost",
          priority: opportunity.priority,
          due_at: opportunity.deadline_at,
          plan_version: "costivra-action-v1",
        }).select("id").single();
        if (actionError) throw actionError;
        actionId = action.id as string;
      }
      const { data: existingApproval, error: approvalLookupError } = await db.from("approvals")
        .select("id").eq("resource_type", "action_plan").eq("resource_id", actionId).eq("decision", "pending").maybeSingle();
      if (approvalLookupError) throw approvalLookupError;
      if (!existingApproval) {
        const { error: approvalError } = await db.from("approvals").insert({
          organization_id: organizationId,
          resource_type: "action_plan",
          resource_id: actionId,
          requested_from: userId,
          decision: "pending",
        });
        if (approvalError) throw approvalError;
      }
    }

    await db.from("audit_events").insert({ organization_id: organizationId, actor_type: "user", actor_id: userId, action: `opportunity.${status || "updated"}`, resource_type: "opportunity", resource_id: id });
    return NextResponse.json({ ok: true, actionId });
  } catch (error) { return apiError(error); }
}
