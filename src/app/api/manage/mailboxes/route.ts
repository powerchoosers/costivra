import { NextResponse } from "next/server";

import {
  manageApiError,
  requireInternalOwner,
} from "@/lib/manage/auth";
import {
  isConfiguredMailboxDomain,
  isValidMailboxLocalPart,
  normalizeMailboxLocalPart,
} from "@/lib/manage/mailboxes";
import { cleanText } from "@/lib/portal/http";

async function isVerifiedResendDomain(domain: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;
  const response = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (!response.ok) return false;
  const body = (await response.json()) as { data?: unknown };
  return Array.isArray(body.data) && body.data.some((item) => {
    if (!item || typeof item !== "object") return false;
    const record = item as { name?: unknown; status?: unknown };
    return record.name === domain && record.status === "verified";
  });
}

export async function POST(request: Request) {
  try {
    const { db, userId } = await requireInternalOwner();
    const body = (await request.json()) as Record<string, unknown>;
    const displayName = cleanText(body.displayName, 100);
    const localPart = normalizeMailboxLocalPart(
      cleanText(body.localPart, 64),
    );
    const domain = cleanText(body.domain, 253).toLowerCase();
    const mailboxType =
      body.mailboxType === "shared" ? "shared" : "personal";
    const assignedTo = cleanText(body.assignedTo, 100);
    if (!displayName || !isValidMailboxLocalPart(localPart))
      return NextResponse.json(
        {
          error:
            "Add a display name and use letters, numbers, dots, dashes, or underscores for the address.",
        },
        { status: 400 },
      );
    if (!isConfiguredMailboxDomain(domain))
      return NextResponse.json(
        { error: "Choose a configured Costivra sending domain." },
        { status: 400 },
      );
    if (!(await isVerifiedResendDomain(domain)))
      return NextResponse.json(
        { error: "That domain is not verified with the email provider yet." },
        { status: 409 },
      );
    if (mailboxType === "personal" && !assignedTo)
      return NextResponse.json(
        { error: "Choose the Costivra team member who will use this mailbox." },
        { status: 400 },
      );
    if (assignedTo) {
      const { data: assignee, error: assigneeError } = await db
        .from("internal_staff_users")
        .select("user_id")
        .eq("user_id", assignedTo)
        .eq("status", "active")
        .maybeSingle();
      if (assigneeError) throw assigneeError;
      if (!assignee)
        return NextResponse.json(
          { error: "Choose an active Costivra team member." },
          { status: 400 },
        );
    }
    const { data: mailbox, error } = await db
      .from("crm_mailboxes")
      .insert({
        display_name: displayName,
        local_part: localPart,
        domain,
        mailbox_type: mailboxType,
        assigned_to: mailboxType === "personal" ? assignedTo : null,
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
      safe_metadata: {
        address: mailbox.address,
        mailbox_type: mailboxType,
        assigned_to: mailboxType === "personal" ? assignedTo : null,
      },
    });
    return NextResponse.json({ ok: true, mailbox });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
