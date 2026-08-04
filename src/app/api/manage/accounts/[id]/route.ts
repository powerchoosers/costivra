import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanText, cleanUuid } from "@/lib/portal/http";
import { normalizeAccountWebsite } from "@/lib/integrations/apollo";

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
    const websiteInput = cleanText(body.website, 2_048);
    const website = websiteInput ? normalizeAccountWebsite(websiteInput) : null;
    const parentAccountId = "parentAccountId" in body
      ? cleanUuid(body.parentAccountId) || null
      : undefined;
    if (parentAccountId === organizationId) {
      return NextResponse.json(
        { error: "An account cannot be its own parent." },
        { status: 400 },
      );
    }
    if (parentAccountId) {
      const parent = await db
        .from("organizations")
        .select("id")
        .eq("id", parentAccountId)
        .maybeSingle();
      if (parent.error) throw parent.error;
      if (!parent.data) {
        return NextResponse.json(
          { error: "Choose an existing parent account." },
          { status: 400 },
        );
      }
    }
    if (nextFollowUpAt && Number.isNaN(Date.parse(nextFollowUpAt)))
      return NextResponse.json(
        { error: "Choose a valid follow-up date." },
        { status: 400 },
      );
    if ("website" in body && websiteInput && !website)
      return NextResponse.json(
        { error: "Enter a public http or https account website." },
        { status: 400 },
      );
    if (parentAccountId !== undefined) {
      const hierarchy = await db
        .from("organizations")
        .update({ parent_organization_id: parentAccountId })
        .eq("id", organizationId);
      if (hierarchy.error) throw hierarchy.error;
    }
    const record = {
      organization_id: organizationId,
      ...("stage" in body ? { lifecycle_stage: stage || "onboarding" } : {}),
      ...("nextFollowUpAt" in body ? { next_follow_up_at: nextFollowUpAt } : {}),
      ...("nextStep" in body ? { next_step: cleanText(body.nextStep, 500) || null } : {}),
      ...("privateNotes" in body ? { private_notes: cleanText(body.privateNotes, 4_000) || null } : {}),
      ...("website" in body ? { website } : {}),
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
          stage: "stage" in body ? stage || "onboarding" : null,
          follow_up_changed: "nextFollowUpAt" in body,
          website_changed: "website" in body,
          parent_account_changed: parentAccountId !== undefined,
          parent_account_id: parentAccountId ?? null,
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
