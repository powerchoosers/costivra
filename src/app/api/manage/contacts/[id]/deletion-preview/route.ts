import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanUuid } from "@/lib/portal/http";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db } = await requireInternalOperator();
    const contactId = cleanUuid((await params).id);
    if (!contactId) {
      return NextResponse.json({ error: "Invalid contact ID." }, { status: 400 });
    }

    const { data: contact } = await db
      .from("crm_contacts")
      .select("id, full_name, email, profile_id, organization_id, is_primary")
      .eq("id", contactId)
      .maybeSingle();

    if (!contact) {
      return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    }

    const [actRes, taskRes, mailThreadRes, mailMessageRes, consentRes, inquiryRes, membershipRes] = await Promise.all([
      db.from("crm_activities").select("id", { count: "exact" }).eq("contact_id", contactId),
      db.from("crm_tasks").select("id", { count: "exact" }).eq("contact_id", contactId),
      db.from("crm_email_threads").select("id", { count: "exact" }).eq("contact_id", contactId),
      db.from("crm_email_messages").select("id", { count: "exact" }).eq("contact_id", contactId),
      db.from("crm_marketing_consents").select("id", { count: "exact" }).eq("contact_id", contactId),
      db.from("contact_inquiries").select("id", { count: "exact" }).eq("contact_id", contactId),
      contact.profile_id ? db.from("organization_memberships").select("organization_id", { count: "exact" }).eq("user_id", contact.profile_id) : Promise.resolve({ count: 0 }),
    ]);

    const activities = actRes.count ?? 0;
    const tasks = taskRes.count ?? 0;
    const mailThreads = mailThreadRes.count ?? 0;
    const mailMessages = mailMessageRes.count ?? 0;
    const consents = consentRes.count ?? 0;
    const inquiries = inquiryRes.count ?? 0;
    const memberships = membershipRes.count ?? 0;
    const hasProfile = Boolean(contact.profile_id);
    const blocked = [activities, tasks, mailThreads, mailMessages, consents, inquiries, memberships].some((count) => count > 0) || Boolean(contact.is_primary);

    return NextResponse.json({
      contactId,
      contactName: contact.full_name || contact.email || "Contact",
      hasProfileLink: hasProfile,
      blocked,
      blockReason: blocked ? "This contact has linked workspace access or CRM history. Preserve the record and deactivate it instead." : undefined,
      counts: [
        { key: "profile_link", label: "Profile Link", count: hasProfile ? 1 : 0 },
        { key: "workspace_memberships", label: "Workspace Memberships", count: memberships },
        { key: "tasks", label: "Tasks", count: tasks },
        { key: "activities", label: "CRM Activities", count: activities },
        { key: "email_threads", label: "Email Threads", count: mailThreads },
        { key: "email_messages", label: "Email Messages", count: mailMessages },
        { key: "marketing_consents", label: "Marketing Consent Records", count: consents },
        { key: "contact_inquiries", label: "Contact Inquiries", count: inquiries },
        { key: "primary_contact", label: "Primary Contact Status", count: contact.is_primary ? 1 : 0 },
      ],
      notice: hasProfile
        ? "Manage workspace access separately. Removing a CRM contact never changes authentication or workspace membership."
        : undefined,
      previewVersion: "v1",
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
