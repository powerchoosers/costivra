import "server-only";

import { createHash } from "node:crypto";
import { isIP } from "node:net";

const APOLLO_BASE_URL = "https://api.apollo.io/api/v1";
const REQUEST_TIMEOUT_MS = 8_000;

type ApolloStatus =
  | "fresh"
  | "no_match"
  | "rate_limited"
  | "forbidden"
  | "unavailable"
  | "invalid";

type JsonRecord = Record<string, unknown>;

export type ApolloCompanyLookup = {
  domain: string;
  matchMethod: "domain" | "website";
};

export type ApolloOrganizationSnapshot = {
  status: ApolloStatus;
  providerOrganizationId: string | null;
  shortDescription: string | null;
  industry: string | null;
  website: string | null;
  linkedinUrl: string | null;
  location: string | null;
  employeeCount: number | null;
  foundedYear: number | null;
  responseHash: string | null;
};

const text = (value: unknown, limit = 1_600) =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, limit)
    : null;
const integer = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
const record = (value: unknown): JsonRecord | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
const hashed = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function providerKey() {
  return process.env.APOLLO_API_KEY?.trim() || null;
}

export function isApolloConfigured() {
  return Boolean(providerKey());
}

function validPublicHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  if (
    !normalized ||
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal") ||
    normalized.endsWith(".test") ||
    normalized.endsWith(".example") ||
    normalized.endsWith(".invalid") ||
    isIP(normalized) ||
    !normalized.includes(".")
  )
    return null;
  return normalized;
}

/**
 * Normalizes an operator-stored lookup URL. The browser never supplies this
 * value directly to Apollo, and local/private network targets are rejected.
 */
export function companyLookupFromWebsite(value: string | null | undefined): ApolloCompanyLookup | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      (url.port && !((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")))
    )
      return null;
    const domain = validPublicHostname(url.hostname);
    return domain ? { domain, matchMethod: "domain" } : null;
  } catch {
    return null;
  }
}

export function normalizeAccountWebsite(value: string | null | undefined) {
  if (!companyLookupFromWebsite(value)) return null;
  const url = new URL(value as string);
  url.username = "";
  url.password = "";
  url.hash = "";
  return url.toString();
}

/**
 * Apollo responses are untrusted provider input. Keep display links public,
 * HTTPS-only, and free of credentials before they ever reach a rendered href.
 */
function publicProfileUrl(value: unknown, requiredDomain?: string) {
  const candidate = text(value, 2_048);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    )
      return null;
    const domain = validPublicHostname(url.hostname);
    if (
      !domain ||
      (requiredDomain && domain !== requiredDomain && !domain.endsWith(`.${requiredDomain}`))
    )
      return null;
    url.protocol = "https:";
    url.username = "";
    url.password = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function locationFrom(source: JsonRecord) {
  const values = [source.city, source.state, source.country]
    .map((value) => text(value, 120))
    .filter((value): value is string => Boolean(value));
  return values.length ? values.join(", ") : null;
}

function statusFor(response: Response): ApolloStatus {
  if (response.status === 401 || response.status === 403) return "forbidden";
  if (response.status === 429) return "rate_limited";
  if (response.status === 400) return "invalid";
  if (response.status === 404 || response.status === 422) return "no_match";
  return "unavailable";
}

async function apolloRequest(path: string, init: RequestInit): Promise<{
  status: ApolloStatus;
  payload: JsonRecord | null;
}> {
  const key = providerKey();
  if (!key) return { status: "unavailable", payload: null };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${APOLLO_BASE_URL}${path}`, {
      ...init,
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
      headers: {
        "x-api-key": key,
        "content-type": "application/json",
        ...init.headers,
      },
    });
    if (!response.ok) return { status: statusFor(response), payload: null };
    const payload = record(await response.json().catch(() => null));
    return payload
      ? { status: "fresh", payload }
      : { status: "unavailable", payload: null };
  } catch {
    return { status: "unavailable", payload: null };
  } finally {
    clearTimeout(timeout);
  }
}

export async function enrichApolloOrganization(
  lookup: ApolloCompanyLookup,
): Promise<ApolloOrganizationSnapshot> {
  const params = new URLSearchParams({ domain: lookup.domain });
  const response = await apolloRequest(`/organizations/enrich?${params}`, {
    method: "GET",
  });
  const organization = response.payload ? record(response.payload.organization) : null;
  if (response.status !== "fresh" || !organization)
    return {
      status: response.status === "fresh" ? "no_match" : response.status,
      providerOrganizationId: null,
      shortDescription: null,
      industry: null,
      website: null,
      linkedinUrl: null,
      location: null,
      employeeCount: null,
      foundedYear: null,
      responseHash: response.payload ? hashed(response.payload) : null,
    };
  const snapshot: ApolloOrganizationSnapshot = {
    status: "fresh",
    providerOrganizationId: text(organization.id, 200),
    shortDescription: text(organization.short_description),
    industry: text(organization.industry, 240),
    website: publicProfileUrl(organization.website_url),
    linkedinUrl: publicProfileUrl(organization.linkedin_url, "linkedin.com"),
    location: locationFrom(organization),
    employeeCount: integer(organization.estimated_num_employees),
    foundedYear: integer(organization.founded_year),
    responseHash: hashed(response.payload),
  };
  const hasUsableCompanyData = Boolean(
    snapshot.providerOrganizationId ||
    snapshot.shortDescription ||
    snapshot.industry ||
    snapshot.website ||
    snapshot.linkedinUrl ||
    snapshot.location ||
    snapshot.employeeCount != null ||
    snapshot.foundedYear != null
  );
  return hasUsableCompanyData
    ? snapshot
    : { ...snapshot, status: "no_match" as const };
}
