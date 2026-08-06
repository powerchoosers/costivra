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

    const { error } = await db.rpc("manage_set_account_archive_state", { p_organization_id: organizationId, p_actor_id: userId, p_archived: true, p_reason: reason });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
