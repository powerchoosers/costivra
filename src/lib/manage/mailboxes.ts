export const COSTIVRA_MAIL_DOMAIN = "costivra.ai";

const MAILBOX_DOMAIN_PATTERN =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function mailboxDomains(value = process.env.COSTIVRA_MAILBOX_DOMAINS) {
  const configured = (value ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter((domain) => MAILBOX_DOMAIN_PATTERN.test(domain));
  return [
    COSTIVRA_MAIL_DOMAIN,
    ...configured.filter((domain) => domain !== COSTIVRA_MAIL_DOMAIN),
  ].filter((domain, index, all) => all.indexOf(domain) === index);
}

export function isConfiguredMailboxDomain(domain: string) {
  return mailboxDomains().includes(domain.trim().toLowerCase());
}

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

export function mailboxAddress(localPart: string, domain = COSTIVRA_MAIL_DOMAIN) {
  return `${normalizeMailboxLocalPart(localPart)}@${domain.trim().toLowerCase()}`;
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
