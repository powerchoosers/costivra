import { NextResponse } from "next/server";
import { manageApiError, requireInternalOwner } from "@/lib/manage/auth";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireInternalOwner();
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Add a number setting to update." }, { status: 400, headers });
    const { data: number, error: numberError } = await owner.db.from("internal_voice_numbers").select("id,phone_number,status").eq("id", id).maybeSingle();
    if (numberError) throw numberError;
    if (!number) return NextResponse.json({ error: "That Costivra number was not found." }, { status: 404, headers });
    if (body.isMain === true) {
      const { error } = await owner.db.from("internal_voice_numbers").update({ is_main: false, updated_by: owner.userId, updated_at: new Date().toISOString() }).eq("status", "active");
      if (error) throw error;
      const { error: activateError } = await owner.db.from("internal_voice_numbers").update({ is_main: true, updated_by: owner.userId, updated_at: new Date().toISOString() }).eq("id", id).eq("status", "active");
      if (activateError) throw activateError;
      await owner.db.from("internal_audit_events").insert({ actor_id: owner.userId, action: "voice.number_designated_main", resource_type: "internal_voice_number", resource_id: id, safe_metadata: { phone_number: number.phone_number } });
    }
    if (Array.isArray(body.operatorIds)) {
      const operatorIds = [...new Set(body.operatorIds.filter((value): value is string => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value)))].slice(0, 10);
      if (operatorIds.length) {
        const { data: activeStaff, error: staffError } = await owner.db
          .from("internal_staff_users")
          .select("user_id")
          .eq("status", "active")
          .in("user_id", operatorIds);
        if (staffError) throw staffError;
        const allowed = new Set((activeStaff ?? []).map((row) => row.user_id as string));
        if (operatorIds.some((operatorId) => !allowed.has(operatorId))) {
          return NextResponse.json({ error: "Choose active Costivra operators only." }, { status: 400, headers });
        }
      }
      await owner.db.from("internal_voice_number_routes").delete().eq("number_id", id);
      if (operatorIds.length) {
        const { error } = await owner.db.from("internal_voice_number_routes").insert(operatorIds.map((operatorId, priority) => ({ number_id: id, operator_id: operatorId, priority, enabled: true })));
        if (error) throw error;
      }
      await owner.db.from("internal_audit_events").insert({ actor_id: owner.userId, action: "voice.number_routes_updated", resource_type: "internal_voice_number", resource_id: id, safe_metadata: { operator_count: operatorIds.length } });
    }
    return NextResponse.json({ ok: true }, { headers });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status, headers });
  }
}
