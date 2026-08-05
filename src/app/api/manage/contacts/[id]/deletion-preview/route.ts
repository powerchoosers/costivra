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
      .select("id, full_name, email, profile_id, organization_id")
      .eq("id", contactId)
      .maybeSingle();

    if (!contact) {
      return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    }

    const [actRes, taskRes, mailRes] = await Promise.all([
      db.from("crm_activities").select("id", { count: "exact" }).eq("contact_id", contactId),
      db.from("crm_tasks").select("id", { count: "exact" }).eq("contact_id", contactId),
      db.from("crm_mail_threads").select("id", { count: "exact" }).eq("contact_id", contactId),
    ]);

    const activities = actRes.count ?? 0;
    const tasks = taskRes.count ?? 0;
    const mailThreads = mailRes.count ?? 0;
    const hasProfile = Boolean(contact.profile_id);

    return NextResponse.json({
      contactId,
      contactName: contact.full_name || contact.email || "Contact",
      hasProfileLink: hasProfile,
      counts: [
        { label: "CRM Activities", count: activities },
        { label: "Tasks", count: tasks },
        { label: "Mail Threads", count: mailThreads },
      ],
      notice: hasProfile
        ? "This contact is linked to a workspace member account. Removing the CRM contact will not revoke workspace authentication."
        : undefined,
    });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
