import { NextResponse } from "next/server";
import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import { cleanText, cleanUuid } from "@/lib/portal/http";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, userId } = await requireInternalOperator();
    const id = cleanUuid((await params).id);
    const body = (await request.json()) as Record<string, unknown>;
    const operation = cleanText(body.operation, 30);
    if (
      !id ||
      ![
        "star",
        "unstar",
        "read",
        "unread",
        "archive",
        "trash",
        "restore",
      ].includes(operation)
    )
      return NextResponse.json(
        { error: "Invalid mail action." },
        { status: 400 },
      );
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (operation === "star" || operation === "unstar")
      updates.is_starred = operation === "star";
    if (operation === "read" || operation === "unread")
      updates.unread_count = operation === "read" ? 0 : 1;
    if (
      operation === "archive" ||
      operation === "trash" ||
      operation === "restore"
    )
      updates.status =
        operation === "restore"
          ? "open"
          : operation === "trash"
            ? "trashed"
            : "archived";
    const { data: thread, error } = await db
      .from("crm_email_threads")
      .update(updates)
      .eq("id", id)
      .select("organization_id")
      .single();
    if (error) throw error;
    await db
      .from("internal_audit_events")
      .insert({
        actor_id: userId,
        organization_id: thread.organization_id,
        action: `crm.email_thread_${operation}`,
        resource_type: "crm_email_thread",
        resource_id: id,
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
