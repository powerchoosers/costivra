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

function parseContact(body: Record<string, unknown>) {
  const contactType = cleanText(body.contactType, 32) || "vendor";
  const preferredChannel = cleanText(body.preferredChannel, 32) || "email";
  const status = cleanText(body.status, 32) || "active";
  const contactName = cleanText(body.contactName, 160);
  const email = normalizeEmail(body.email);
  const websiteUrl = normalizeUrl(body.websiteUrl);
  const phone = cleanText(body.phone, 48) || null;
  const companyName = cleanText(body.companyName, 160) || null;
  const title = cleanText(body.title, 160) || null;
  const phoneExtension = cleanText(body.phoneExtension, 16) || null;
  const notes = cleanText(body.notes, 2000) || null;

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
      company_name: companyName,
      contact_name: contactName,
      title,
      email,
      phone,
      phone_extension: phoneExtension,
      website_url: websiteUrl,
      preferred_channel: preferredChannel,
      is_primary: body.isPrimary === true,
      status,
      notes,
    },
  };
}

async function clearExistingPrimary(db: ServerDatabase, organizationId: string, relationshipId: string, contactType: string, exceptId?: string) {
  let query = db
    .from("organization_vendor_contacts")
    .update({ is_primary: false })
    .eq("organization_id", organizationId)
    .eq("organization_vendor_id", relationshipId)
    .eq("contact_type", contactType)
    .eq("status", "active")
    .eq("is_primary", true);
  if (exceptId) query = query.neq("id", exceptId);
  const { error } = await query;
  if (error) throw error;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, organizationId, userId } = await requirePortalEditor();
    const relationshipId = cleanUuid((await params).id);
    if (!relationshipId) return NextResponse.json({ error: "Invalid vendor relationship ID." }, { status: 400 });

    const { data: relationship, error: relationshipError } = await db
      .from("organization_vendors")
      .select("id")
      .eq("id", relationshipId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (relationshipError) throw relationshipError;
    if (!relationship) return NextResponse.json({ error: "Vendor relationship not found." }, { status: 404 });

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = parseContact(body);
    if (parsed.error || !parsed.value) return NextResponse.json({ error: parsed.error ?? "Enter the contact details." }, { status: 400 });
    const contact = parsed.value;

    if (contact.is_primary && contact.status === "active") {
      await clearExistingPrimary(db, organizationId, relationshipId, contact.contact_type);
    }

    const { data, error } = await db
      .from("organization_vendor_contacts")
      .insert({
        organization_id: organizationId,
        organization_vendor_id: relationshipId,
        ...contact,
        created_by: userId,
        updated_by: userId,
      })
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
      action: "vendor_contact_created",
      resource_type: "vendor_contact",
      resource_id: data.id,
      safe_metadata: {
        organization_vendor_id: relationshipId,
        contact_type: contact.contact_type,
        fields_present: ["company_name", "contact_name", "title", "email", "phone", "website_url"].filter((field) => Boolean(contact[field as keyof typeof contact])),
      },
    });
    if (auditError) throw auditError;

    return NextResponse.json({ ok: true, contact: data }, { status: 201 });
  } catch (error) {
    return apiError(error, "Failed to add vendor contact.");
  }
}
