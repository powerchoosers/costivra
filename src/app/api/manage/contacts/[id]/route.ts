import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanText, cleanUuid } from "@/lib/portal/http";

export async function PATCH(
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
      .select("id, organization_id, is_primary")
      .eq("id", contactId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!contact) {
      return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const expectedUpdatedAt = typeof body.expectedUpdatedAt === "string" ? body.expectedUpdatedAt : "";
    if (!expectedUpdatedAt || Number.isNaN(Date.parse(expectedUpdatedAt))) return NextResponse.json({ error: "A current record version is required." }, { status: 400 });

    const fullName = "fullName" in body ? cleanText(body.fullName, 120) || null : undefined;
    const email = "email" in body ? cleanText(body.email, 255) || null : undefined;
    const phone = "phone" in body ? cleanText(body.phone, 50) || null : undefined;
    const title = "title" in body ? cleanText(body.title, 100) || null : undefined;
    const targetOrganizationId = "organizationId" in body ? cleanUuid(body.organizationId) || null : undefined;
    const isPrimary = "isPrimary" in body ? Boolean(body.isPrimary) : undefined;
    const status = "status" in body ? cleanText(body.status, 30) || "active" : undefined;

    const newOrgId = targetOrganizationId ?? contact.organization_id;
    if (email !== undefined && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    if (status !== undefined && !["active", "inactive", "bounced", "unsubscribed"].includes(status)) return NextResponse.json({ error: "Choose a valid contact status." }, { status: 400 });

    const { data: updatedAt, error: mutationError } = await db.rpc("manage_update_contact_record", {
      p_contact_id: contactId, p_actor_id: userId, p_expected_updated_at: expectedUpdatedAt,
      p_updates: { ...(fullName !== undefined ? { full_name: fullName } : {}), ...(email !== undefined ? { email: email?.toLowerCase() } : {}), ...(phone !== undefined ? { phone } : {}), ...(title !== undefined ? { title } : {}), ...(targetOrganizationId !== undefined ? { organization_id: targetOrganizationId } : {}), ...(isPrimary !== undefined ? { is_primary: isPrimary } : {}), ...(status !== undefined ? { status } : {}) },
    });
    if (mutationError) {
      if (mutationError.message.includes("RECORD_CONFLICT")) return NextResponse.json({ error: "This record changed in another session. Reload the latest version before saving.", code: "record_conflict" }, { status: 409 });
      if (mutationError.message.includes("RECORD_NOT_FOUND")) return NextResponse.json({ error: "Contact not found." }, { status: 404 });
      throw mutationError;
    }
    return NextResponse.json({ ok: true, updatedAt });

    // Handle primary contact status transactionally if changed to true
    if (isPrimary === true) {
      await db.from("crm_contacts").update({ is_primary: false }).eq("organization_id", newOrgId);
    }

    const updateRecord = {
      ...(fullName !== undefined ? { full_name: fullName } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(title !== undefined ? { title } : {}),
      ...(targetOrganizationId !== undefined ? { organization_id: targetOrganizationId } : {}),
      ...(isPrimary !== undefined ? { is_primary: isPrimary } : {}),
      ...(status !== undefined ? { status } : {}),
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await db
      .from("crm_contacts")
      .update(updateRecord)
      .eq("id", contactId);

    if (updateErr) throw updateErr;

    await db.from("crm_activities").insert({
      organization_id: newOrgId,
      actor_id: userId,
      contact_id: contactId,
      kind: "status_change",
      direction: "internal",
      subject: "Contact details updated",
      summary: fullName ? `Name updated: ${fullName}` : null,
    });

    await db.from("internal_audit_events").insert({
      actor_id: userId,
      organization_id: newOrgId,
      action: "crm.contact_updated",
      resource_type: "contact",
      resource_id: contactId,
      safe_metadata: {
        fields_updated: Object.keys(updateRecord),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, userId } = await requireInternalOperator();
    const contactId = cleanUuid((await params).id);
    if (!contactId) {
      return NextResponse.json({ error: "Invalid contact ID." }, { status: 400 });
    }

    const { data: contact } = await db
      .from("crm_contacts")
      .select("id, organization_id, profile_id, email")
      .eq("id", contactId)
      .maybeSingle();

    if (!contact) {
      return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    }

    // Safely delete CRM contact record (leaves auth profiles & workspace memberships intact)
    const { error: deleteErr } = await db.from("crm_contacts").delete().eq("id", contactId);
    if (deleteErr) throw deleteErr;

    await db.from("internal_audit_events").insert({
      actor_id: userId,
      organization_id: contact.organization_id,
      action: "crm.contact_removed",
      resource_type: "contact",
      resource_id: contactId,
      safe_metadata: {
        had_profile_link: Boolean(contact.profile_id),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
