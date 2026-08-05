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
    const reason = cleanText(body.reason, 500) || "Restored to active CRM view";

    const { error: profileErr } = await db
      .from("crm_account_profiles")
      .upsert(
        {
          organization_id: organizationId,
          visible_in_crm: true,
          visibility_reason: reason,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id" },
      );

    if (profileErr) throw profileErr;

    await db.from("internal_audit_events").insert({
      actor_id: userId,
      organization_id: organizationId,
      action: "crm.account_restored",
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
