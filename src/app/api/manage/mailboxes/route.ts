import { NextResponse } from "next/server";

import {
  manageApiError,
  requireInternalOwner,
} from "@/lib/manage/auth";
import {
  COSTIVRA_MAIL_DOMAIN,
  isValidMailboxLocalPart,
  normalizeMailboxLocalPart,
} from "@/lib/manage/mailboxes";
import { cleanText } from "@/lib/portal/http";

export async function POST(request: Request) {
  try {
    const { db, userId } = await requireInternalOwner();
    const body = (await request.json()) as Record<string, unknown>;
    const displayName = cleanText(body.displayName, 100);
    const localPart = normalizeMailboxLocalPart(
      cleanText(body.localPart, 64),
    );
    const mailboxType =
      body.mailboxType === "shared" ? "shared" : "personal";
    if (!displayName || !isValidMailboxLocalPart(localPart))
      return NextResponse.json(
        {
          error:
            "Add a display name and use letters, numbers, dots, dashes, or underscores for the address.",
        },
        { status: 400 },
      );
    const { data: mailbox, error } = await db
      .from("crm_mailboxes")
      .insert({
        display_name: displayName,
        local_part: localPart,
        domain: COSTIVRA_MAIL_DOMAIN,
        mailbox_type: mailboxType,
        status: "active",
        can_send: true,
        can_receive: true,
        created_by: userId,
        updated_by: userId,
      })
      .select("id,address")
      .single();
    if (error?.code === "23505")
      return NextResponse.json(
        { error: "That Costivra mailbox already exists." },
        { status: 409 },
      );
    if (error) throw error;
    await db.from("internal_audit_events").insert({
      actor_id: userId,
      action: "crm.mailbox_created",
      resource_type: "crm_mailbox",
      resource_id: mailbox.id,
      safe_metadata: { address: mailbox.address, mailbox_type: mailboxType },
    });
    return NextResponse.json({ ok: true, mailbox });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}

