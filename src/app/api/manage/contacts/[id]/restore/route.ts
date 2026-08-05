import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanUuid } from "@/lib/portal/http";

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

    const { data: contact, error: fetchErr } = await db
      .from("crm_contacts")
      .select("id, organization_id")
      .eq("id", contactId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!contact) {
      return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    }

    const { error: updateErr } = await db
      .from("crm_contacts")
      .update({
        archived_at: null,
        archived_by: null,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", contactId);

    if (updateErr) throw updateErr;

    await db.from("internal_audit_events").insert({
      actor_id: userId,
      organization_id: contact.organization_id,
      action: "crm.contact_restored",
      resource_type: "contact",
      resource_id: contactId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
