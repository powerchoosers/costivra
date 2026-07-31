import "server-only";

import type { requireInternalOperator } from "@/lib/manage/auth";
import { canUseMailbox, formatMailboxSender } from "@/lib/manage/mailboxes";

type Operator = Awaited<ReturnType<typeof requireInternalOperator>>;

export async function requireMailbox(
  operator: Operator,
  mailboxId: string,
  capability: "send" | "receive" | "read" = "read",
) {
  const { data, error } = await operator.db
    .from("crm_mailboxes")
    .select(
      "id,display_name,address,mailbox_type,assigned_to,status,can_send,can_receive,is_default",
    )
    .eq("id", mailboxId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("MAILBOX_ACCESS_REQUIRED");
  const mailbox = {
    id: data.id as string,
    displayName: data.display_name as string,
    address: data.address as string,
    mailboxType:
      data.mailbox_type === "shared"
        ? ("shared" as const)
        : ("personal" as const),
    assignedTo:
      typeof data.assigned_to === "string" ? data.assigned_to : null,
    status:
      data.status === "disabled"
        ? ("disabled" as const)
        : ("active" as const),
    canSend: Boolean(data.can_send),
    canReceive: Boolean(data.can_receive),
    isDefault: Boolean(data.is_default),
  };
  if (!canUseMailbox(operator.role, operator.userId, mailbox))
    throw new Error("MAILBOX_ACCESS_REQUIRED");
  if (capability === "send" && !mailbox.canSend)
    throw new Error("MAILBOX_ACCESS_REQUIRED");
  if (capability === "receive" && !mailbox.canReceive)
    throw new Error("MAILBOX_ACCESS_REQUIRED");
  return {
    ...mailbox,
    sender: formatMailboxSender(mailbox.displayName, mailbox.address),
  };
}

