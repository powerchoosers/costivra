export function normalizeEmailAddress(value: string) {
  const bracketed = value.match(/<([^>]+)>/);
  return (bracketed?.[1] ?? value).trim().toLowerCase();
}

export function normalizeTrustedSenders(values: unknown[], memberEmails: string[]) {
  return new Set(
    [...values.filter((value): value is string => typeof value === "string"), ...memberEmails]
      .map(normalizeEmailAddress)
      .filter(Boolean),
  );
}

export function isTrustedInboundSender(sender: string, trustedSenders: ReadonlySet<string>) {
  return trustedSenders.has(normalizeEmailAddress(sender));
}

export function matchesIntakeAddress(
  recipients: string[],
  intake: { local_part: string; domain: string },
) {
  const address = `${intake.local_part}@${intake.domain}`.toLowerCase();
  return recipients.map(normalizeEmailAddress).includes(address);
}
