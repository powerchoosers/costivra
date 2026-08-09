import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanUuid } from "@/lib/portal/http";
type Context = { params: Promise<{ id: string }> };
export async function POST(_request: Request, { params }: Context) {
  try { const { db, userId } = await requireInternalOperator(); const id = cleanUuid((await params).id); if (!id) return NextResponse.json({ error: "Invalid sequence." }, { status: 400 }); const { data, error } = await db.from("crm_sequences").update({ status: "archived", archived_at: new Date().toISOString(), execution_enabled: false, updated_at: new Date().toISOString() }).eq("id", id).in("status", ["draft", "paused"]).select("id,status").maybeSingle(); if (error) throw error; if (!data) return NextResponse.json({ error: "Active sequences must be stopped before archiving." }, { status: 409 }); await db.from("internal_audit_events").insert({ actor_id: userId, action: "crm.sequence_archived", resource_type: "crm_sequence", resource_id: id }); return NextResponse.json({ sequence: data }); }
  catch (error) { const result = manageApiError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
