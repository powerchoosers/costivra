import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { classifySequenceFailure } from "@/lib/manage/sequences/recovery";
import { cleanUuid } from "@/lib/portal/http";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Context) {
  try {
    const { db, userId } = await requireInternalOperator();
    const id = cleanUuid((await params).id);
    if (!id) return NextResponse.json({ error: "Invalid recovery item." }, { status: 400 });
    const { data: effect, error } = await db.from("external_side_effects").select("id,status,provider_reference,failure_class,sanitized_request_metadata").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!effect) return NextResponse.json({ error: "Recovery item not found." }, { status: 404 });
    const classification = classifySequenceFailure(effect);
    if (classification === "provider_ambiguous") return NextResponse.json({ error: "Reconciliation is required before retrying this provider request." }, { status: 409 });
    if (classification !== "safe_retry") return NextResponse.json({ error: "This item is not eligible for an automatic retry." }, { status: 409 });
    const metadata = effect.sanitized_request_metadata && typeof effect.sanitized_request_metadata === "object" ? effect.sanitized_request_metadata as Record<string, unknown> : {};
    const enrollmentId = typeof metadata.sequence_enrollment_id === "string" ? metadata.sequence_enrollment_id : null;
    if (!enrollmentId) return NextResponse.json({ error: "The failed request has no recoverable enrollment." }, { status: 409 });
    const now = new Date().toISOString();
    const { error: updateError } = await db.from("crm_sequence_enrollments").update({ state: "active", next_action_at: now, stop_reason: null, last_error_code: null, updated_at: now }).eq("id", enrollmentId).in("state", ["failed", "paused"]);
    if (updateError) throw updateError;
    await db.from("internal_audit_events").insert({ actor_id: userId, action: "crm.sequence_retry_requested", resource_type: "external_side_effect", resource_id: id, safe_metadata: { enrollment_id: enrollmentId } });
    return NextResponse.json({ ok: true, queued: true, enrollmentId });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
