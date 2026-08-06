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
    const reason = cleanText(body.reason, 200);
    if (!reason) return NextResponse.json({ error: "Explain why this contact is being deactivated." }, { status: 400 });
    const { data: contact, error: contactError } = await db.from("crm_contacts").select("id, is_primary").eq("id", contactId).maybeSingle();
    if (contactError) throw contactError;
    if (!contact) return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    if (contact.is_primary && body.primaryDisposition !== "clear") {
      return NextResponse.json({ error: "This is the primary contact. Confirm clearing primary-contact status or select a replacement before deactivating." }, { status: 400 });
    }

    const { data: status, error } = await db.rpc("manage_set_contact_active_state", { p_contact_id: contactId, p_actor_id: userId, p_active: false, p_reason: reason });
    if (error?.message.includes("RECORD_NOT_FOUND")) return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    if (error) throw error;
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
