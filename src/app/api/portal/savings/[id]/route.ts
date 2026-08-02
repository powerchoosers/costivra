import { NextResponse } from "next/server";
import { apiError, cleanText, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { workflowRpcError } from "@/lib/portal/workflow-rpc";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, organizationId, userId, role } = await requirePortalContext();
    if (!['owner', 'admin'].includes(role)) return NextResponse.json({ error: "An owner or administrator must verify savings." }, { status: 403 });
    const id = cleanUuid((await params).id);
    if (!id) return NextResponse.json({ error: "Invalid savings record." }, { status: 400 });
    const body = await request.json() as Record<string, unknown>;
    const operation = cleanText(body.operation, 30);
    const reason = cleanText(body.reason, 1000);
    const { error } = await db.rpc("internal_apply_savings_operation", {
      p_organization_id: organizationId,
      p_savings_id: id,
      p_actor_id: userId,
      p_operation: operation,
      p_reason: reason || null,
    });
    if (error) {
      const known = workflowRpcError(error);
      if (known) return NextResponse.json({ error: known.message }, { status: known.status });
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
