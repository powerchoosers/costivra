import { NextResponse } from "next/server";
import { apiError, cleanText, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { workflowRpcError } from "@/lib/portal/workflow-rpc";

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
    const deadlineSupplied = Object.prototype.hasOwnProperty.call(body, "deadlineAt");
    const deadlineText = deadlineSupplied ? cleanText(body.deadlineAt, 40) : "";
    if (deadlineText && !Number.isFinite(Date.parse(deadlineText))) {
      return NextResponse.json({ error: "Choose a valid opportunity deadline." }, { status: 400 });
    }
    if (priority && !["high", "medium", "low"].includes(priority)) {
      return NextResponse.json({ error: "Choose a valid opportunity priority." }, { status: 400 });
    }
    const { data: actionId, error } = await db.rpc("internal_apply_opportunity_operation", {
      p_organization_id: organizationId,
      p_opportunity_id: id,
      p_actor_id: userId,
      p_status: status || null,
      p_priority: priority || null,
      p_deadline_at: deadlineText || null,
      p_update_deadline: deadlineSupplied,
    });
    if (error) {
      const known = workflowRpcError(error);
      if (known) return NextResponse.json({ error: known.message }, { status: known.status });
      throw error;
    }
    return NextResponse.json({ ok: true, actionId });
  } catch (error) { return apiError(error); }
}
