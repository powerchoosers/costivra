import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanText, cleanUuid } from "@/lib/portal/http";

export async function POST(request: Request) {
  try {
    const { db, userId } = await requireInternalOperator();
    const body = (await request.json()) as Record<string, unknown>;
    const organizationId = cleanUuid(body.organizationId);
    const subject = cleanText(body.subject, 300);
    if (!organizationId || !subject)
      return NextResponse.json(
        { error: "Choose an account and enter a note title." },
        { status: 400 },
      );
    const { data: activity, error } = await db
      .from("crm_activities")
      .insert({
        organization_id: organizationId,
        actor_id: userId,
        kind: "note",
        direction: "internal",
        subject,
        summary: cleanText(body.summary, 4_000) || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    await db
      .from("internal_audit_events")
      .insert({
        actor_id: userId,
        organization_id: organizationId,
        action: "crm.note_created",
        resource_type: "crm_activity",
        resource_id: activity.id,
      });
    return NextResponse.json({ ok: true, id: activity.id }, { status: 201 });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
}
