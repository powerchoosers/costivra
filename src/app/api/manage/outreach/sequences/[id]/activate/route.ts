import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { getSequence } from "@/lib/manage/sequences/repository";
import { validateSequenceDraft } from "@/lib/manage/sequences/validation";
import { cleanUuid } from "@/lib/portal/http";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Context) {
  try {
    const { db, userId } = await requireInternalOperator();
    const id = cleanUuid((await params).id);
    if (!id) return NextResponse.json({ error: "Invalid sequence." }, { status: 400 });
    if (process.env.COSTIVRA_SEQUENCE_EXECUTION_ENABLED !== "true") {
      return NextResponse.json({ error: "Sequence execution is not enabled for this release." }, { status: 409 });
    }

    const sequence = await getSequence(db, id);
    if (!sequence) return NextResponse.json({ error: "Sequence not found." }, { status: 404 });
    if (sequence.status !== "draft" && sequence.status !== "paused") {
      return NextResponse.json({ error: "Only draft or paused sequences can be activated." }, { status: 409 });
    }
    const validation = validateSequenceDraft(sequence, { forActivation: true });
    if (!validation.valid) {
      return NextResponse.json({ error: "This sequence needs attention before activation.", details: validation.errors }, { status: 409 });
    }

    const now = new Date().toISOString();
    const { data, error } = await db
      .from("crm_sequences")
      .update({
        status: "active",
        execution_enabled: true,
        activated_at: sequence.activatedAt ?? now,
        paused_at: null,
        updated_at: now,
      })
      .eq("id", id)
      .in("status", ["draft", "paused"])
      .select("id,status,execution_enabled,activated_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "The sequence changed before activation. Reload and try again." }, { status: 409 });

    await db.from("internal_audit_events").insert({
      actor_id: userId,
      organization_id: sequence.organizationId,
      action: "crm.sequence_activated",
      resource_type: "crm_sequence",
      resource_id: id,
      safe_metadata: { execution_enabled: true, step_count: sequence.steps.length },
    });
    return NextResponse.json({ sequence: data });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
