import { NextResponse } from "next/server";
import { apiError, cleanText, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";
import { workflowRpcError } from "@/lib/portal/workflow-rpc";
import { sendLifecycleEmailToWorkspace } from "@/lib/email/lifecycle-recipient";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, organizationId, userId, role } = await requirePortalContext();
    if (!['owner', 'admin'].includes(role)) return NextResponse.json({ error: "An owner or administrator must verify savings." }, { status: 403 });
    const id = cleanUuid((await params).id);
    if (!id) return NextResponse.json({ error: "Invalid savings record." }, { status: 400 });
    const body = await request.json() as Record<string, unknown>;
    const operation = cleanText(body.operation, 30);
    const reason = cleanText(body.reason, 1000);
    const { data: nextStatus, error } = await db.rpc("internal_apply_savings_operation", {
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
    // Notify only after the authoritative workflow has committed `verified`.
    // A ready-for-review outcome is intentionally not described as verified.
    if (operation === "verify" && nextStatus === "verified") {
      try {
        const { data: outcome } = await db
          .from("savings_outcomes")
          .select("opportunity_id")
          .eq("id", id)
          .eq("organization_id", organizationId)
          .maybeSingle();
        const { data: opportunity } = outcome?.opportunity_id
          ? await db.from("opportunities").select("title").eq("id", outcome.opportunity_id).eq("organization_id", organizationId).maybeSingle()
          : { data: null };
        await sendLifecycleEmailToWorkspace({
          db,
          kind: "verification_ready",
          organizationId,
          payload: {
            findingTitle: typeof opportunity?.title === "string" ? opportunity.title : undefined,
            sourceRecordId: id,
          },
        });
      } catch (emailError) {
        console.error("verification lifecycle email failed", emailError);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
