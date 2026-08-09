import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanUuid } from "@/lib/portal/http";
import { canResumeEnrollment } from "@/lib/manage/sequences/enrollment-controls";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Context) {
  try {
    const { db, userId } = await requireInternalOperator();
    const id = cleanUuid((await params).id);
    if (!id) return NextResponse.json({ error: "Invalid enrollment." }, { status: 400 });

    const { data: current, error: currentError } = await db
      .from("crm_sequence_enrollments")
      .select("id,sequence_id,state,lock_token")
      .eq("id", id)
      .maybeSingle();
    if (currentError) throw currentError;
    if (!current) return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });
    if (!canResumeEnrollment(current.state)) return NextResponse.json({ error: "That enrollment is not paused." }, { status: 409 });
    if (current.lock_token) return NextResponse.json({ error: "That enrollment is being processed. Try again in a moment." }, { status: 409 });

    const { data: sequence, error: sequenceError } = await db
      .from("crm_sequences")
      .select("status,execution_enabled")
      .eq("id", current.sequence_id)
      .maybeSingle();
    if (sequenceError) throw sequenceError;
    if (!sequence || sequence.status !== "active" || sequence.execution_enabled !== true) {
      return NextResponse.json({ error: "Resume the sequence first; it is not currently executing." }, { status: 409 });
    }

    const now = new Date().toISOString();
    const { data, error } = await db
      .from("crm_sequence_enrollments")
      .update({
        state: "active",
        paused_at: null,
        next_action_at: now,
        lock_token: null,
        locked_at: null,
        updated_at: now,
      })
      .eq("id", id)
      .eq("state", "paused")
      .is("lock_token", null)
      .select("id,state,next_action_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "The enrollment changed before it could be resumed. Refresh and try again." }, { status: 409 });

    const { error: eventError } = await db.from("crm_sequence_events").insert({
      sequence_id: current.sequence_id,
      enrollment_id: id,
      event_type: "resumed",
      safe_metadata: { actor_id: userId, next_action_at: now },
    });
    if (eventError) throw eventError;
    return NextResponse.json({ enrollment: data });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
