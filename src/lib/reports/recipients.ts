export function normalizeReportRecipients(values: unknown) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean))];
}

export function authorizedReportRecipients(values: unknown, authorizedEmails: Iterable<string>) {
  const authorized = new Set([...authorizedEmails].map((email) => email.trim().toLowerCase()).filter(Boolean));
  return normalizeReportRecipients(values).filter((email) => authorized.has(email));
}
