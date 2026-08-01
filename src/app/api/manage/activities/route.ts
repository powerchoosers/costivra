import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanText, cleanUuid } from "@/lib/portal/http";
import { deliverInternalNoteMention } from "@/lib/email/internal-note-mention";

export async function POST(request: Request) {
  try {
    const { db, userId, fullName } = await requireInternalOperator();
    const body = (await request.json()) as Record<string, unknown>;
    const organizationId = cleanUuid(body.organizationId);
    const subject = cleanText(body.subject, 300);
    if (!organizationId || !subject)
      return NextResponse.json(
        { error: "Choose an account and enter a note title." },
        { status: 400 },
      );
    const mentionInput = typeof body.mentionedUserIds === "string"
      ? (() => { try { return JSON.parse(body.mentionedUserIds); } catch { return []; } })()
      : body.mentionedUserIds;
    const mentionedUserIds = Array.isArray(mentionInput)
      ? Array.from(new Set(mentionInput.map(cleanUuid).filter(Boolean))).slice(0, 10)
      : [];
    const [{ data: organization, error: organizationError }, { data: staff, error: staffError }] = await Promise.all([
      db.from("organizations").select("name").eq("id", organizationId).maybeSingle(),
      mentionedUserIds.length ? db.from("internal_staff_users").select("user_id").in("user_id", mentionedUserIds).eq("status", "active") : Promise.resolve({ data: [], error: null }),
    ]);
    if (organizationError) throw organizationError;
    if (staffError) throw staffError;
    if (staff && staff.length !== mentionedUserIds.length)
      return NextResponse.json({ error: "One or more mentioned teammates are no longer active." }, { status: 409 });
    const { data: recipientProfiles, error: profilesError } = mentionedUserIds.length
      ? await db.from("profiles").select("id,email,full_name").in("id", mentionedUserIds)
      : { data: [], error: null };
    if (profilesError) throw profilesError;
    const profilesById = new Map((recipientProfiles ?? []).map((profile) => [profile.id, profile]));
    const summary = cleanText(body.summary, 4_000) || null;
    const { data: activity, error } = await db
      .from("crm_activities")
      .insert({
        organization_id: organizationId,
        actor_id: userId,
        kind: "note",
        direction: "internal",
        subject,
        summary,
      })
      .select("id")
      .single();
    if (error) throw error;
    if (mentionedUserIds.length) {
      const mentionRows = mentionedUserIds.map((mentionedUserId) => ({ activity_id: activity.id, mentioned_user_id: mentionedUserId, mentioned_by: userId }));
      const { error: mentionsError } = await db.from("crm_activity_mentions").insert(mentionRows);
      if (mentionsError) throw mentionsError;
      const notifications = mentionedUserIds.map((mentionedUserId) => ({ organization_id: organizationId, recipient_user_id: mentionedUserId, kind: "note_mention", title: `${fullName} mentioned you in a note`, body: subject, resource_type: "crm_activity", resource_id: activity.id, action_href: `/manage/accounts/${organizationId}` }));
      const { error: notificationError } = await db.from("internal_notifications").insert(notifications);
      if (notificationError) throw notificationError;
      await Promise.allSettled((staff ?? []).map((member) => {
        const profile = profilesById.get(member.user_id);
        const recipientEmail = typeof profile?.email === "string" ? profile.email : "";
        if (!recipientEmail) return Promise.resolve(false);
        return deliverInternalNoteMention(db, { activityId: activity.id, organizationId, accountName: typeof organization?.name === "string" ? organization.name : "Client account", subject, summary, actorName: fullName, recipientId: member.user_id, recipientEmail, recipientName: typeof profile?.full_name === "string" ? profile.full_name : recipientEmail });
      }));
    }
    await db
      .from("internal_audit_events")
      .insert({
        actor_id: userId,
        organization_id: organizationId,
        action: "crm.note_created",
        resource_type: "crm_activity",
        resource_id: activity.id,
      });
    return NextResponse.json({ ok: true, id: activity.id, mentionCount: mentionedUserIds.length }, { status: 201 });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
}
