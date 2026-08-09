import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanText, cleanUuid } from "@/lib/portal/http";
import { canStopEnrollment } from "@/lib/manage/sequences/enrollment-controls";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { db, userId } = await requireInternalOperator();
    const id = cleanUuid((await params).id);
    if (!id) return NextResponse.json({ error: "Invalid enrollment." }, { status: 400 });
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const { data: current, error: currentError } = await db
      .from("crm_sequence_enrollments")
      .select("id,sequence_id,state,lock_token")
      .eq("id", id)
      .maybeSingle();
    if (currentError) throw currentError;
    if (!current) return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });
    if (!canStopEnrollment(current.state)) {
      return NextResponse.json({ error: "That enrollment is already terminal." }, { status: 409 });
    }
    if (current.lock_token) {
      return NextResponse.json({ error: "That enrollment is being processed. Try stopping it again in a moment." }, { status: 409 });
    }

    const reason = cleanText(body.reason, 240) || "Stopped by operator";
    const now = new Date().toISOString();
    const { data, error } = await db
      .from("crm_sequence_enrollments")
      .update({
        state: "stopped",
        stopped_at: now,
        stop_reason: reason,
        next_action_at: null,
        lock_token: null,
        locked_at: null,
        updated_at: now,
      })
      .eq("id", id)
      .in("state", ["pending", "active", "paused", "waiting_for_task"])
      .is("lock_token", null)
      .select("id,state,stop_reason")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "The enrollment changed before it could be stopped. Refresh and try again." }, { status: 409 });

    const { error: eventError } = await db.from("crm_sequence_events").insert({
      sequence_id: current.sequence_id,
      enrollment_id: id,
      event_type: "stopped",
      safe_metadata: { actor_id: userId, reason, next_action_at_cleared: true },
    });
    if (eventError) throw eventError;
    return NextResponse.json({ enrollment: data });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
