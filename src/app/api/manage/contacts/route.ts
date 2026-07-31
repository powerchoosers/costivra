import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanText, cleanUuid } from "@/lib/portal/http";

export async function POST(request: Request) {
  try {
    const { db, userId } = await requireInternalOperator();
    const body = (await request.json()) as Record<string, unknown>;
    const organizationId = cleanUuid(body.organizationId);
    const fullName = cleanText(body.fullName, 160);
    const email = cleanText(body.email, 254).toLowerCase();
    if (!organizationId || !fullName || !/^\S+@\S+\.\S+$/.test(email))
      return NextResponse.json(
        { error: "Choose an account and enter a name and valid email." },
        { status: 400 },
      );
    const { data: contact, error } = await db
      .from("crm_contacts")
      .insert({
        organization_id: organizationId,
        full_name: fullName,
        email,
        title: cleanText(body.title, 120) || null,
        phone: cleanText(body.phone, 50) || null,
        is_primary: Boolean(body.isPrimary),
      })
      .select("id")
      .single();
    if (error) throw error;
    await db
      .from("internal_audit_events")
      .insert({
        actor_id: userId,
        organization_id: organizationId,
        action: "crm.contact_created",
        resource_type: "crm_contact",
        resource_id: contact.id,
      });
    return NextResponse.json({ ok: true, id: contact.id }, { status: 201 });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
}
