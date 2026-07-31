import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanText, cleanUuid } from "@/lib/portal/http";

const stages = new Set([
  "lead",
  "onboarding",
  "active",
  "at_risk",
  "inactive",
  "closed",
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, userId } = await requireInternalOperator();
    const organizationId = cleanUuid((await params).id);
    if (!organizationId)
      return NextResponse.json({ error: "Invalid account." }, { status: 400 });
    const body = (await request.json()) as Record<string, unknown>;
    const stage = cleanText(body.stage, 30);
    if (stage && !stages.has(stage))
      return NextResponse.json(
        { error: "Choose a valid account stage." },
        { status: 400 },
      );
    const nextFollowUpAt = cleanText(body.nextFollowUpAt, 40) || null;
    if (nextFollowUpAt && Number.isNaN(Date.parse(nextFollowUpAt)))
      return NextResponse.json(
        { error: "Choose a valid follow-up date." },
        { status: 400 },
      );
    const record = {
      organization_id: organizationId,
      ...(stage ? { lifecycle_stage: stage } : {}),
      next_follow_up_at: nextFollowUpAt,
      next_step: cleanText(body.nextStep, 500) || null,
      private_notes: cleanText(body.privateNotes, 4_000) || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await db
      .from("crm_account_profiles")
      .upsert(record, { onConflict: "organization_id" });
    if (error) throw error;
    await db
      .from("crm_activities")
      .insert({
        organization_id: organizationId,
        actor_id: userId,
        kind: "status_change",
        direction: "internal",
        subject: "Account details updated",
        summary: stage ? `Lifecycle stage: ${stage}` : null,
      });
    await db
      .from("internal_audit_events")
      .insert({
        actor_id: userId,
        organization_id: organizationId,
        action: "crm.account_updated",
        resource_type: "organization",
        resource_id: organizationId,
        safe_metadata: {
          stage: stage || null,
          follow_up_changed: "nextFollowUpAt" in body,
        },
      });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
}
