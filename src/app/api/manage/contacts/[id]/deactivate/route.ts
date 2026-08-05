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

    const { data: contact, error: fetchErr } = await db
      .from("crm_contacts")
      .select("id, organization_id, status")
      .eq("id", contactId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!contact) {
      return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    }

    const isDeactivating = contact.status !== "inactive" && contact.status !== "archived";
    const nextStatus = isDeactivating ? "inactive" : "active";

    const { error: updateErr } = await db
      .from("crm_contacts")
      .update({
        status: nextStatus,
        archived_at: isDeactivating ? new Date().toISOString() : null,
        archived_by: isDeactivating ? userId : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contactId);

    if (updateErr) throw updateErr;

    await db.from("internal_audit_events").insert({
      actor_id: userId,
      organization_id: contact.organization_id,
      action: isDeactivating ? "crm.contact_deactivated" : "crm.contact_reactivated",
      resource_type: "contact",
      resource_id: contactId,
      safe_metadata: { reason },
    });

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
