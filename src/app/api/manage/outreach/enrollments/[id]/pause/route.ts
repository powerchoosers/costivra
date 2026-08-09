import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanUuid } from "@/lib/portal/http";
type Context = { params: Promise<{ id: string }> };
export async function POST(_request: Request, { params }: Context) {
  try { const { db, userId } = await requireInternalOperator(); const id = cleanUuid((await params).id); if (!id) return NextResponse.json({ error: "Invalid enrollment." }, { status: 400 }); const { data: current } = await db.from("crm_sequence_enrollments").select("id,sequence_id,state").eq("id", id).maybeSingle(); if (!current) return NextResponse.json({ error: "Enrollment not found." }, { status: 404 }); if (!["pending", "active", "waiting_for_task"].includes(current.state)) return NextResponse.json({ error: "That enrollment cannot be paused." }, { status: 409 }); const { data, error } = await db.from("crm_sequence_enrollments").update({ state: "paused", paused_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).select("id,state").single(); if (error) throw error; await db.from("crm_sequence_events").insert({ sequence_id: current.sequence_id, enrollment_id: id, event_type: "paused", safe_metadata: { actor_id: userId } }); return NextResponse.json({ enrollment: data }); }
  catch (error) { const result = manageApiError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
