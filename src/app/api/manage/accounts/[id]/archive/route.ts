import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanUuid, cleanText } from "@/lib/portal/http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, userId } = await requireInternalOperator();
    const organizationId = cleanUuid((await params).id);
    if (!organizationId) {
      return NextResponse.json({ error: "Invalid account ID." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const reason = cleanText(body.reason, 200) || "Account archived by internal operator";

    const { error: profileErr } = await db.from("crm_account_profiles").upsert(
      {
        organization_id: organizationId,
        visible_in_crm: false,
        lifecycle_stage: "inactive",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" },
    );

    if (profileErr) throw profileErr;

    await db.from("crm_activities").insert({
      organization_id: organizationId,
      actor_id: userId,
      kind: "status_change",
      direction: "internal",
      subject: "Account archived",
      summary: reason,
    });

    await db.from("internal_audit_events").insert({
      actor_id: userId,
      organization_id: organizationId,
      action: "crm.account_archived",
      resource_type: "organization",
      resource_id: organizationId,
      safe_metadata: { reason },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
