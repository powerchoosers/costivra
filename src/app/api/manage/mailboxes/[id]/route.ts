import { NextResponse } from "next/server";

import {
  manageApiError,
  requireInternalOwner,
} from "@/lib/manage/auth";
import { cleanText, cleanUuid } from "@/lib/portal/http";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db, userId } = await requireInternalOwner();
    const id = cleanUuid((await params).id);
    const body = (await request.json()) as Record<string, unknown>;
    const operation = cleanText(body.operation, 30);
    if (!id || !["enable", "disable"].includes(operation))
      return NextResponse.json(
        { error: "Choose a valid mailbox action." },
        { status: 400 },
      );
    const { data: current, error: currentError } = await db
      .from("crm_mailboxes")
      .select("id,address,is_default,status")
      .eq("id", id)
      .maybeSingle();
    if (currentError) throw currentError;
    if (!current)
      return NextResponse.json(
        { error: "Mailbox not found." },
        { status: 404 },
      );
    if (operation === "disable" && current.is_default)
      return NextResponse.json(
        { error: "The default owner mailbox cannot be disabled." },
        { status: 409 },
      );
    const status = operation === "enable" ? "active" : "disabled";
    const { error } = await db
      .from("crm_mailboxes")
      .update({
        status,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
    await db.from("internal_audit_events").insert({
      actor_id: userId,
      action: `crm.mailbox_${operation}d`,
      resource_type: "crm_mailbox",
      resource_id: id,
      safe_metadata: { address: current.address },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
