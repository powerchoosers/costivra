import { NextResponse } from "next/server";
import { apiError, cleanUuid } from "@/lib/portal/http";
import { requirePortalContext } from "@/lib/portal/repository";

export async function PATCH(request: Request) {
  try {
    const { db, organizationId, userId } = await requirePortalContext();
    const body = await request.json() as Record<string, unknown>;
    const id = cleanUuid(body.id);
    let query = db.from("notifications").update({ read_at: new Date().toISOString() }).eq("organization_id", organizationId).or(`recipient_user_id.is.null,recipient_user_id.eq.${userId}`).is("read_at", null);
    if (id) query = query.eq("id", id);
    const { error } = await query;
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
