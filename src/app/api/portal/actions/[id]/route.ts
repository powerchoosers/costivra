import { NextResponse } from "next/server";
import { apiError, cleanText, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, organizationId, userId } = await requirePortalContext();
    const id = cleanUuid((await params).id);
    const body = await request.json() as Record<string, unknown>;
    const operation = cleanText(body.operation, 30);
    const { data: action, error: actionError } = await db.from("action_plans").select("id,opportunity_id,status").eq("id", id).single();
    if (actionError) throw actionError;
    const { data: opportunity } = await db.from("opportunities").select("id,organization_id").eq("id", action.opportunity_id).eq("organization_id", organizationId).single();
    if (!opportunity) return NextResponse.json({ error: "Action not found." }, { status: 404 });
    if (operation === "approve" || operation === "decline") {
      const decision = operation === "approve" ? "approved" : "declined";
      const { error: approvalError } = await db.from("approvals").update({ decision, decision_reason: cleanText(body.reason, 500) || null, decided_at: new Date().toISOString() }).eq("resource_id", id).eq("requested_from", userId).eq("decision", "pending");
      if (approvalError) throw approvalError;
      await db.from("action_plans").update({ status: operation === "approve" ? "approved" : "cancelled", updated_at: new Date().toISOString() }).eq("id", id);
      await db.from("opportunities").update({ status: operation === "approve" ? "approved" : "declined", updated_at: new Date().toISOString() }).eq("id", opportunity.id);
    } else if (operation === "start") {
      await db.from("action_plans").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", id);
      await db.from("opportunities").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", opportunity.id);
    } else if (operation === "complete") {
      await db.from("action_plans").update({ status: "complete", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id);
    } else return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    await db.from("audit_events").insert({ organization_id: organizationId, actor_type: "user", actor_id: userId, action: `action_plan.${operation}`, resource_type: "action_plan", resource_id: id });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
