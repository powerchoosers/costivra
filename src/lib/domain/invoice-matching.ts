import type { InvoiceCandidate } from "@/lib/domain/invoices";

export type IdentityMatchStatus = "matched" | "unmatched" | "ambiguous" | "unknown";

export type InvoiceIdentityResolution = {
  workspaceCustomerMatchStatus: IdentityMatchStatus;
  expenseAccountMatchStatus: IdentityMatchStatus;
  serviceLocationMatchStatus: IdentityMatchStatus;
  expenseAccountId: string | null;
  locationId: string | null;
  issueCodes: string[];
};

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function metadata(row: Row): Row {
  return row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    ? row.metadata as Row
    : {};
}

export function normalizeIdentity(value: unknown): string {
  return typeof value === "string"
    ? value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "").trim()
    : "";
}

export function normalizeAddress(value: unknown): string {
  const raw = typeof value === "string"
    ? value
    : value && typeof value === "object" && !Array.isArray(value)
      ? Object.entries(value as Row)
        .filter(([key]) => [
          "address", "address1", "address_line1", "addressLine1", "line1", "line2", "street",
          "street1", "city", "state", "postal_code", "postalCode", "zip", "zip_code",
        ].includes(key))
        .map(([, item]) => text(item))
        .filter((item): item is string => Boolean(item))
        .join(" ")
      : "";
  return raw
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\b(street|st)\b/g, "st")
    .replace(/\b(avenue|ave)\b/g, "ave")
    .replace(/\b(road|rd)\b/g, "rd")
    .replace(/\b(highway|hwy)\b/g, "hwy")
    .replace(/\b(parkway|pkwy)\b/g, "pkwy")
    .replace(/\b(boulevard|blvd)\b/g, "blvd")
    .replace(/\b(drive|dr)\b/g, "dr")
    .replace(/\b(lane|ln)\b/g, "ln")
    .replace(/\b(suite|ste)\b/g, "ste")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function accountEvidence(row: Row): string[] {
  const details = metadata(row);
  return [
    row.external_account_reference,
    row.account_number_last4,
    row.service_identifier,
    row.serviceIdentifier,
    row.esi_id,
    row.esiId,
    row.meter_id,
    row.meterId,
    row.service_address,
    row.serviceAddress,
    details.external_account_reference,
    details.account_number_last4,
    details.service_identifier,
    details.serviceIdentifier,
    details.esi_id,
    details.esiId,
    details.meter_id,
    details.meterId,
    details.service_address,
    details.serviceAddress,
  ].map(text).filter((item): item is string => Boolean(item));
}

function lastFour(value: string): string {
  const normalized = normalizeIdentity(value);
  return normalized.slice(-4);
}

function energyServices(candidate: InvoiceCandidate) {
  const services = candidate.energyServices?.length
    ? candidate.energyServices
    : candidate.energyService
      ? [candidate.energyService]
      : [];
  return services;
}

export function resolveWorkspaceCustomer(
  sourceName: string | null,
  workspaceNames: string[],
): IdentityMatchStatus {
  if (!sourceName) return "unknown";
  const source = normalizeIdentity(sourceName);
  if (!source || !workspaceNames.some((name) => normalizeIdentity(name) === source)) return "unmatched";
  return "matched";
}

function resolveExpenseAccount(candidate: InvoiceCandidate, accounts: Row[]): {
  status: IdentityMatchStatus;
  id: string | null;
  serviceIdentifierMatched: boolean;
} {
  const services = energyServices(candidate);
  const accountLast4 = candidate.accountNumberLast4 ? lastFour(candidate.accountNumberLast4) : "";
  const serviceIdentifiers = [
    ...services.flatMap((service) => [service.serviceIdentifier, service.meterId]),
    ...(candidate.serviceDetails?.serviceIdentifiers ?? []),
    ...(candidate.serviceDetails?.circuitIds ?? []),
    ...(candidate.serviceDetails?.subscriptionIdentifiers ?? []),
    ...(candidate.serviceDetails?.resourceIdentifiers ?? []),
    ...(candidate.serviceDetails?.cloudAccountIdentifiers ?? []),
  ]
    .map((value) => value ? normalizeIdentity(value) : "")
    .filter(Boolean);
  const sourceAddresses = services
    .map((service) => service.serviceAddress ? normalizeAddress(service.serviceAddress) : "")
    .concat((candidate.serviceDetails?.serviceAddresses ?? []).map(normalizeAddress))
    .filter(Boolean);
  const hasEvidence = Boolean(accountLast4 || serviceIdentifiers.length || sourceAddresses.length);
  if (!hasEvidence) return { status: "unknown", id: null, serviceIdentifierMatched: false };

  const identifierMatchedIds = new Set<string>();
  const scored = accounts.flatMap((account) => {
    const values = accountEvidence(account);
    const normalizedValues = values.map(normalizeIdentity).filter(Boolean);
    const accountId = text(account.id);
    if (accountId && serviceIdentifiers.some((identifier) => normalizedValues.includes(identifier))) identifierMatchedIds.add(accountId);
    let score = 0;
    if (accountLast4 && normalizedValues.some((value) => value === accountLast4 || value.endsWith(accountLast4))) score += 3;
    if (serviceIdentifiers.some((identifier) => normalizedValues.includes(identifier))) score += 5;
    if (sourceAddresses.some((address) => values.some((value) => normalizeAddress(value) === address))) score += 4;
    return score > 0 ? [{ id: text(account.id), score }] : [];
  }).filter((entry): entry is { id: string; score: number } => Boolean(entry.id));

  if (!scored.length) return { status: "unmatched", id: null, serviceIdentifierMatched: false };
  const highest = Math.max(...scored.map((entry) => entry.score));
  const winners = scored.filter((entry) => entry.score === highest);
  return winners.length === 1
    ? { status: "matched", id: winners[0].id, serviceIdentifierMatched: identifierMatchedIds.has(winners[0].id) }
    : { status: "ambiguous", id: null, serviceIdentifierMatched: false };
}

function resolveLocation(serviceAddress: string | null, locations: Row[]): {
  status: IdentityMatchStatus;
  id: string | null;
} {
  if (!serviceAddress) return { status: "unknown", id: null };
  const normalizedSource = normalizeAddress(serviceAddress);
  if (!normalizedSource) return { status: "unknown", id: null };
  const matches = locations.filter((location) => normalizeAddress(location.address) === normalizedSource);
  if (matches.length === 1) return { status: "matched", id: text(matches[0].id) };
  if (matches.length > 1) return { status: "ambiguous", id: null };
  return { status: "unmatched", id: null };
}

export function resolveInvoiceIdentity(input: {
  candidate: InvoiceCandidate;
  workspaceNames: string[];
  accounts: Row[];
  locations: Row[];
  customerName?: string | null;
  serviceAddress?: string | null;
}): InvoiceIdentityResolution {
  const services = energyServices(input.candidate);
  const sourceCustomerNames = [
    input.customerName,
    ...services.map((service) => service.customerName),
  ].map(text).filter((value): value is string => Boolean(value));
  const customerStatuses = sourceCustomerNames.map((name) =>
    resolveWorkspaceCustomer(name, input.workspaceNames),
  );
  const workspaceCustomerMatchStatus = customerStatuses.includes("unmatched")
    ? "unmatched"
    : customerStatuses.includes("matched")
      ? "matched"
      : "unknown";
  const account = resolveExpenseAccount(input.candidate, input.accounts);
  const sourceAddresses = [
    input.serviceAddress,
    ...services.map((service) => service.serviceAddress),
    ...(input.candidate.serviceDetails?.serviceAddresses ?? []),
  ].map(text).filter((value): value is string => Boolean(value));
  const locationResults = sourceAddresses.map((address) => resolveLocation(address, input.locations));
  const location = locationResults.length === 0
    ? resolveLocation(null, input.locations)
    : {
        id: locationResults.find((result) => result.status === "matched")?.id ?? null,
        status: locationResults.some((result) => result.status === "ambiguous")
          ? "ambiguous" as const
          : locationResults.some((result) => result.status === "unmatched")
            ? "unmatched" as const
            : "matched" as const,
      };
  const issueCodes: string[] = [];

  if (workspaceCustomerMatchStatus === "unmatched") issueCodes.push("workspace_customer_name_mismatch");
  if (account.status !== "matched" && account.status !== "unknown") issueCodes.push("expense_account_unmatched");
  if (services.some((service) => service.serviceIdentifier || service.meterId)) {
    if (!account.serviceIdentifierMatched) issueCodes.push("service_identifier_unmatched");
  }
  if (location.status !== "matched" && location.status !== "unknown") issueCodes.push("service_location_unmatched");

  return {
    workspaceCustomerMatchStatus,
    expenseAccountMatchStatus: account.status,
    serviceLocationMatchStatus: location.status,
    expenseAccountId: account.id,
    locationId: location.id,
    issueCodes,
  };
}
