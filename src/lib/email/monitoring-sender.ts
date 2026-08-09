/** Normalize the sender address used for a vendor-monitoring authorization check. */
export function normalizeMonitoringSender(value: string | null | undefined) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  const displayAddress = raw.match(/<([^<>\s]+@[^<>\s]+)>/);
  return (displayAddress?.[1] ?? raw).trim();
}

/** Pending monitoring tests require an exact approved sender match. */
export function isApprovedMonitoringSender(sender: string | null | undefined, approved: string | null | undefined) {
  const normalizedSender = normalizeMonitoringSender(sender);
  const normalizedApproved = normalizeMonitoringSender(approved);
  return Boolean(normalizedSender && normalizedApproved && normalizedSender === normalizedApproved);
}
