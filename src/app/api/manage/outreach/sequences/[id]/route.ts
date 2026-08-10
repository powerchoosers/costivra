import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { getSequenceWithStats } from "@/lib/manage/sequences/repository";
import { cleanText, cleanUuid } from "@/lib/portal/http";
import { isValidSequenceTimezone } from "@/lib/manage/sequences/schedule";
import { isValidLocalTime } from "@/lib/manage/sequences/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { db } = await requireInternalOperator();
    const id = cleanUuid((await params).id);
    const sequence = id ? await getSequenceWithStats(db, id) : null;
    return sequence
      ? NextResponse.json({ sequence, executionEnabled: process.env.COSTIVRA_SEQUENCE_EXECUTION_ENABLED === "true" }, { headers: { "Cache-Control": "private, no-store" } })
      : NextResponse.json({ error: "Sequence not found." }, { status: 404 });
  } catch (error) {
    const result = manageApiError(error); return NextResponse.json({ error: result.error }, { status: result.status });
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { db, userId } = await requireInternalOperator();
    const id = cleanUuid((await params).id); if (!id) return NextResponse.json({ error: "Invalid sequence." }, { status: 400 });
    const body = await request.json() as Record<string, unknown>;
    const { data: current, error: currentError } = await db.from("crm_sequences").select("status,timezone,business_days,send_start_local,send_end_local").eq("id", id).maybeSingle();
    if (currentError) throw currentError;
    if (!current) return NextResponse.json({ error: "Sequence not found." }, { status: 404 });
    if (current.status !== "draft") return NextResponse.json({ error: "Only draft sequences can be edited in this packet." }, { status: 409 });
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.name === "string") patch.name = cleanText(body.name, 160);
    if (typeof body.description === "string") patch.description = cleanText(body.description, 2_000) || null;
    if (typeof body.timezone === "string") {
      const timezone = cleanText(body.timezone, 80);
      if (!isValidSequenceTimezone(timezone)) return NextResponse.json({ error: "Choose a valid timezone." }, { status: 400 });
      patch.timezone = timezone;
    }
    for (const [input, column] of [["sendStartLocal", "send_start_local"], ["sendEndLocal", "send_end_local"]] as const) {
      if (typeof body[input] !== "string") continue;
      const value = cleanText(body[input], 5);
      if (!isValidLocalTime(value)) return NextResponse.json({ error: "Choose valid send times." }, { status: 400 });
      patch[column] = value;
    }
    if (Array.isArray(body.businessDays)) {
      const days = body.businessDays;
      if (!days.length || !days.every((value): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6) || new Set(days).size !== days.length) return NextResponse.json({ error: "Choose each business day once." }, { status: 400 });
      patch.business_days = days;
    }
    if (typeof body.dailySendLimit === "number") {
      if (!Number.isFinite(body.dailySendLimit)) return NextResponse.json({ error: "Choose a valid daily send limit." }, { status: 400 });
      patch.daily_send_limit = Math.max(1, Math.min(100, Math.trunc(body.dailySendLimit)));
    }
    if (typeof body.stopCompanyOnReply === "boolean") patch.stop_company_on_reply = body.stopCompanyOnReply;
    const nextStart = typeof patch.send_start_local === "string" ? patch.send_start_local : String(current.send_start_local).slice(0, 5);
    const nextEnd = typeof patch.send_end_local === "string" ? patch.send_end_local : String(current.send_end_local).slice(0, 5);
    if (!isValidLocalTime(nextStart) || !isValidLocalTime(nextEnd) || nextStart >= nextEnd) return NextResponse.json({ error: "The send window must use valid times and end after it starts." }, { status: 400 });
    const { data, error } = await db.from("crm_sequences").update(patch).eq("id", id).eq("status", "draft").select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Only draft sequences can be edited in this packet." }, { status: 409 });
    await db.from("internal_audit_events").insert({ actor_id: userId, action: "crm.sequence_updated", resource_type: "crm_sequence", resource_id: id });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const result = manageApiError(error); return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
