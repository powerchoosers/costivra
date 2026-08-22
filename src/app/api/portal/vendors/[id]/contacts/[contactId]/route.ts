import { NextResponse } from "next/server";
import { requirePortalEditor } from "@/lib/portal/repository";
import { apiError, cleanText, cleanUuid } from "@/lib/portal/http";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ServerDatabase = ReturnType<typeof createServerSupabaseClient>;

const contactTypes = new Set(["vendor", "billing", "support", "broker", "consultant", "other"]);
const preferredChannels = new Set(["email", "phone", "portal", "other"]);
const statuses = new Set(["active", "inactive"]);

function normalizeEmail(value: unknown) {
  const email = cleanText(value, 320).toLowerCase();
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

function normalizeUrl(value: unknown) {
  const url = cleanText(value, 2048);
  if (!url) return null;
  return /^https?:\/\/[^\s/$.?#][^\s]*$/i.test(url) ? url : undefined;
}

function validateContact(contact: Record<string, unknown>) {
  const contactType = cleanText(contact.contactType, 32);
  const preferredChannel = cleanText(contact.preferredChannel, 32);
  const status = cleanText(contact.status, 32);
  const contactName = cleanText(contact.contactName, 160);
  const email = normalizeEmail(contact.email);
  const websiteUrl = normalizeUrl(contact.websiteUrl);
  const phone = cleanText(contact.phone, 48) || null;

  if (!contactTypes.has(contactType)) return { error: "Choose a valid contact role." };
  if (!preferredChannels.has(preferredChannel)) return { error: "Choose a valid preferred contact method." };
  if (!statuses.has(status)) return { error: "Choose a valid contact status." };
  if (!contactName) return { error: "Enter a contact or desk name." };
  if (email === undefined) return { error: "Enter a valid email address." };
  if (websiteUrl === undefined) return { error: "Enter a public http or https website." };
  if (!email && !phone && !websiteUrl) return { error: "Add an email, phone number, or website so this contact can be reached." };

  return {
    value: {
      contact_type: contactType,
      company_name: cleanText(contact.companyName, 160) || null,
      contact_name: contactName,
      title: cleanText(contact.title, 160) || null,
      email,
      phone,
      phone_extension: cleanText(contact.phoneExtension, 16) || null,
      website_url: websiteUrl,
      preferred_channel: preferredChannel,
      is_primary: contact.isPrimary === true,
      status,
      notes: cleanText(contact.notes, 2000) || null,
    },
  };
}

async function clearExistingPrimary(db: ServerDatabase, organizationId: string, relationshipId: string, contactType: string, exceptId: string) {
  const { error } = await db
    .from("organization_vendor_contacts")
    .update({ is_primary: false })
    .eq("organization_id", organizationId)
    .eq("organization_vendor_id", relationshipId)
    .eq("contact_type", contactType)
    .eq("status", "active")
    .eq("is_primary", true)
    .neq("id", exceptId);
  if (error) throw error;
}

async function getContact(db: ServerDatabase, organizationId: string, relationshipId: string, contactId: string) {
  const { data, error } = await db
    .from("organization_vendor_contacts")
    .select("*")
    .eq("id", contactId)
    .eq("organization_id", organizationId)
    .eq("organization_vendor_id", relationshipId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  try {
    const { db, organizationId, userId } = await requirePortalEditor();
    const { id, contactId: rawContactId } = await params;
    const relationshipId = cleanUuid(id);
    const contactId = cleanUuid(rawContactId);
    if (!relationshipId || !contactId) return NextResponse.json({ error: "Invalid vendor contact ID." }, { status: 400 });

    const current = await getContact(db, organizationId, relationshipId, contactId);
    if (!current) return NextResponse.json({ error: "Vendor contact not found." }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const merged = {
      contactType: body.contactType ?? current.contact_type,
      companyName: body.companyName ?? current.company_name,
      contactName: body.contactName ?? current.contact_name,
      title: body.title ?? current.title,
      email: body.email ?? current.email,
      phone: body.phone ?? current.phone,
      phoneExtension: body.phoneExtension ?? current.phone_extension,
      websiteUrl: body.websiteUrl ?? current.website_url,
      preferredChannel: body.preferredChannel ?? current.preferred_channel,
      isPrimary: body.isPrimary ?? current.is_primary,
      status: body.status ?? current.status,
      notes: body.notes ?? current.notes,
    };
    const parsed = validateContact(merged);
    if (parsed.error || !parsed.value) return NextResponse.json({ error: parsed.error ?? "Enter the contact details." }, { status: 400 });
    const contact = parsed.value;

    if (contact.is_primary && contact.status === "active") {
      await clearExistingPrimary(db, organizationId, relationshipId, contact.contact_type, contactId);
    }

    const verifiedUpdate = body.markVerified === true
      ? { last_verified_at: new Date().toISOString(), last_verified_by: userId }
      : body.markVerified === false
        ? { last_verified_at: null, last_verified_by: null }
        : {};
    const { data, error } = await db
      .from("organization_vendor_contacts")
      .update({ ...contact, ...verifiedUpdate, updated_by: userId, updated_at: new Date().toISOString() })
      .eq("id", contactId)
      .eq("organization_id", organizationId)
      .eq("organization_vendor_id", relationshipId)
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Only one primary contact is allowed for this role." }, { status: 409 });
      throw error;
    }

    const { error: auditError } = await db.from("audit_events").insert({
      organization_id: organizationId,
      actor_type: "user",
      actor_id: userId,
      action: "vendor_contact_updated",
      resource_type: "vendor_contact",
      resource_id: contactId,
      safe_metadata: { organization_vendor_id: relationshipId, contact_type: contact.contact_type, marked_verified: body.markVerified === true },
    });
    if (auditError) throw auditError;

    return NextResponse.json({ ok: true, contact: data });
  } catch (error) {
    return apiError(error, "Failed to update vendor contact.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> },
) {
  try {
    const { db, organizationId, userId } = await requirePortalEditor();
    const { id, contactId: rawContactId } = await params;
    const relationshipId = cleanUuid(id);
    const contactId = cleanUuid(rawContactId);
    if (!relationshipId || !contactId) return NextResponse.json({ error: "Invalid vendor contact ID." }, { status: 400 });
    const current = await getContact(db, organizationId, relationshipId, contactId);
    if (!current) return NextResponse.json({ error: "Vendor contact not found." }, { status: 404 });

    const { error } = await db
      .from("organization_vendor_contacts")
      .delete()
      .eq("id", contactId)
      .eq("organization_id", organizationId)
      .eq("organization_vendor_id", relationshipId);
    if (error) throw error;

    const { error: auditError } = await db.from("audit_events").insert({
      organization_id: organizationId,
      actor_type: "user",
      actor_id: userId,
      action: "vendor_contact_deleted",
      resource_type: "vendor_contact",
      resource_id: contactId,
      safe_metadata: { organization_vendor_id: relationshipId, contact_type: current.contact_type },
    });
    if (auditError) throw auditError;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Failed to remove vendor contact.");
  }
}
