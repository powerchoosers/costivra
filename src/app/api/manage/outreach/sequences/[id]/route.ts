import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { getSequence } from "@/lib/manage/sequences/repository";
import { cleanText, cleanUuid } from "@/lib/portal/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { db } = await requireInternalOperator();
    const id = cleanUuid((await params).id);
    const sequence = id ? await getSequence(db, id) : null;
    return sequence ? NextResponse.json({ sequence }) : NextResponse.json({ error: "Sequence not found." }, { status: 404 });
  } catch (error) {
    const result = manageApiError(error); return NextResponse.json({ error: result.error }, { status: result.status });
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { db, userId } = await requireInternalOperator();
    const id = cleanUuid((await params).id); if (!id) return NextResponse.json({ error: "Invalid sequence." }, { status: 400 });
    const body = await request.json() as Record<string, unknown>;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.name === "string") patch.name = cleanText(body.name, 160);
    if (typeof body.description === "string") patch.description = cleanText(body.description, 2_000) || null;
    for (const [input, column] of [["timezone", "timezone"], ["sendStartLocal", "send_start_local"], ["sendEndLocal", "send_end_local"]] as const) if (typeof body[input] === "string") patch[column] = cleanText(body[input], 80);
    if (Array.isArray(body.businessDays)) patch.business_days = body.businessDays.filter((value): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6);
    if (typeof body.dailySendLimit === "number") patch.daily_send_limit = Math.max(1, Math.min(100, Math.trunc(body.dailySendLimit)));
    if (typeof body.stopCompanyOnReply === "boolean") patch.stop_company_on_reply = body.stopCompanyOnReply;
    const { data, error } = await db.from("crm_sequences").update(patch).eq("id", id).eq("status", "draft").select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Only draft sequences can be edited in this packet." }, { status: 409 });
    await db.from("internal_audit_events").insert({ actor_id: userId, action: "crm.sequence_updated", resource_type: "crm_sequence", resource_id: id });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const result = manageApiError(error); return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
