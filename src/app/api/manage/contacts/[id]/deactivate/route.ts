import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanUuid, cleanText } from "@/lib/portal/http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, userId } = await requireInternalOperator();
    const contactId = cleanUuid((await params).id);
    if (!contactId) {
      return NextResponse.json({ error: "Invalid contact ID." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const reason = cleanText(body.reason, 200) || "Contact deactivated by internal operator";

    const { data: status, error } = await db.rpc("manage_set_contact_active_state", { p_contact_id: contactId, p_actor_id: userId, p_active: false, p_reason: reason });
    if (error?.message.includes("RECORD_NOT_FOUND")) return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    if (error) throw error;
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
