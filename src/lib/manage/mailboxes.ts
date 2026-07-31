export const COSTIVRA_MAIL_DOMAIN = "costivra.ai";

export function normalizeMailboxLocalPart(value: string) {
  return value.trim().toLowerCase();
}

export function isValidMailboxLocalPart(value: string) {
  const normalized = normalizeMailboxLocalPart(value);
  return (
    normalized.length >= 1 &&
    normalized.length <= 64 &&
    /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(normalized)
  );
}

export function mailboxAddress(localPart: string) {
  return `${normalizeMailboxLocalPart(localPart)}@${COSTIVRA_MAIL_DOMAIN}`;
}

export function formatMailboxSender(displayName: string, address: string) {
  const safeName = displayName.replace(/[\r\n<>]/g, " ").trim();
  return safeName ? `${safeName} <${address}>` : address;
}

export function canUseMailbox(
  role: "owner" | "operator",
  userId: string,
  mailbox: {
    mailboxType: "personal" | "shared";
    assignedTo: string | null;
    status: "active" | "disabled";
  },
) {
  if (mailbox.status !== "active") return false;
  if (role === "owner") return true;
  return mailbox.mailboxType === "shared" || mailbox.assignedTo === userId;
}

