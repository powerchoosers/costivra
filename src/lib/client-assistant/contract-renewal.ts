export type UpcomingContract = {
  id: string;
  title: string;
  vendorName: string | null;
  endDate: string;
  noticeDeadline: string | null;
  autoRenews: boolean;
};

export function isNextContractExpirationQuestion(prompt: string) {
  const normalized = prompt.toLowerCase();
  const asksAboutContracts = /\b(contract|contracts|agreement|agreements)\b/.test(normalized);
  const asksAboutTiming = /\b(next|upcoming|expire|expires|expiring|expiration|end|ending|renew|renewal)\b/.test(normalized);
  return asksAboutContracts && asksAboutTiming;
}

export function describeNextContractExpiration(contracts: UpcomingContract[]) {
  const next = contracts[0];
  if (!next) return null;

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${next.endDate}T00:00:00Z`));
  const label = next.vendorName ? `${next.vendorName} — ${next.title}` : next.title;
  const renewalNote = next.autoRenews ? " It is recorded as automatically renewing." : "";

  return `Your next recorded contract expiration is ${label} on ${formattedDate}.${renewalNote}`;
}
