import "server-only";

import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { isConfiguredSecret } from "@/lib/env/secrets";

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
  name: string | null;
  shortDescription: string | null;
  industry: string | null;
  website: string | null;
  logoUrl: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  location: string | null;
  employeeCount: number | null;
  foundedYear: number | null;
  technologies: string[];
  responseHash: string | null;
};

export type ApolloOrganizationSearchResult = {
  providerOrganizationId: string;
  name: string;
  shortDescription: string | null;
  website: string | null;
  logoUrl: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  industry: string | null;
  location: string | null;
  employeeCount: number | null;
  foundedYear: number | null;
  technologies: string[];
  exact: boolean;
  detailsLoaded: boolean;
};

export type ApolloCreditUsage = {
  status: ApolloStatus;
  checkedAt: string;
  leadCredits: {
    limit: number;
    used: number;
    remaining: number;
  } | null;
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
  return isConfiguredSecret(process.env.APOLLO_API_KEY) ? process.env.APOLLO_API_KEY!.trim() : null;
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

function technologiesFrom(source: JsonRecord) {
  const values = [source.current_technologies, source.technologies, source.technology_names]
    .find((value) => Array.isArray(value)) as unknown[] | undefined;
  if (!values) return [];
  return Array.from(
    new Set(
      values
        .map((value) => {
          if (typeof value === "string") return value;
          const item = record(value);
          return text(item?.name ?? item?.technology_name ?? item?.technologyName, 120);
        })
        .filter((value): value is string => Boolean(value))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).slice(0, 40);
}

function phoneFrom(source: JsonRecord) {
  const direct = [
    source.phone,
    source.phone_number,
    source.corporate_phone,
    source.primary_phone,
    source.organization_phone,
  ];
  const nested = [source.phone_numbers, source.phoneNumbers]
    .filter(Array.isArray)
    .flatMap((value) => value as unknown[])
    .map((value) => {
      const item = record(value);
      return item?.sanitized_number ?? item?.raw_number ?? item?.phone_number ?? item?.number;
    });
  const value = [...direct, ...nested]
    .map((item) => text(item, 80))
    .find((item) => item && /\d/.test(item));
  return value ?? null;
}

function hostnameFrom(value: string | null) {
  if (!value) return null;
  try {
    return validPublicHostname(new URL(value).hostname);
  } catch {
    return null;
  }
}

function websiteFrom(source: JsonRecord) {
  const candidate = text(source.website_url ?? source.website, 2_048);
  if (candidate) {
    const normalized = publicProfileUrl(candidate);
    if (normalized) return normalized;
    const hostname = validPublicHostname(candidate.replace(/^https?:\/\//i, "").split("/")[0] ?? "");
    if (hostname) return `https://${hostname}/`;
  }
  const primaryDomain = text(source.primary_domain ?? source.domain, 253);
  const hostname = primaryDomain ? validPublicHostname(primaryDomain) : null;
  return hostname ? `https://${hostname}/` : null;
}

function normalizedCompanyName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function organizationFrom(value: unknown) {
  const source = record(value);
  if (!source) return null;
  const name = text(source.name ?? source.organization_name, 240);
  const website = websiteFrom(source);
  const id = text(source.organization_id ?? source.id, 200);
  if (!id) return null;
  return {
    source,
    id,
    name,
    shortDescription: text(source.short_description),
    website,
    logoUrl: publicProfileUrl(source.logo_url ?? source.logo),
    linkedinUrl: publicProfileUrl(source.linkedin_url, "linkedin.com"),
    phone: phoneFrom(source),
    industry: text(source.industry, 240),
    location: locationFrom(source),
    employeeCount: integer(source.estimated_num_employees ?? source.employee_count),
    foundedYear: integer(source.founded_year),
    technologies: technologiesFrom(source),
  };
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

/**
 * Reads the authenticated Apollo user's lead-credit balance. Apollo documents
 * this profile request as a zero-credit operation. Only normalized totals are
 * returned so provider identity fields and the API key never reach the client.
 */
export async function getApolloCreditUsage(): Promise<ApolloCreditUsage> {
  const response = await apolloRequest("/users/api_profile?include_credit_usage=true", {
    method: "GET",
    headers: { accept: "application/json" },
  });
  const checkedAt = new Date().toISOString();
  if (response.status !== "fresh" || !response.payload)
    return { status: response.status, checkedAt, leadCredits: null };

  const limit = integer(response.payload.effective_num_lead_credits);
  const profileUsed = integer(response.payload.num_lead_credits_used);
  const reportedRemaining = integer(response.payload.num_credits_remaining);
  if (limit == null || (profileUsed == null && reportedRemaining == null))
    return { status: "unavailable", checkedAt, leadCredits: null };

  const remaining = Math.min(reportedRemaining ?? Math.max(0, limit - (profileUsed ?? 0)), limit);
  // Apollo's profile payload can report usage for the key owner while the
  // remaining balance is team-wide. Derive the displayed team usage from the
  // internally consistent allowance and remaining balance when it is present.
  const used = reportedRemaining == null
    ? Math.min(profileUsed ?? 0, limit)
    : Math.max(0, limit - remaining);
  return {
    status: "fresh",
    checkedAt,
    leadCredits: {
      limit,
      used,
      remaining,
    },
  };
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
      name: null,
      shortDescription: null,
      industry: null,
      website: null,
      logoUrl: null,
      linkedinUrl: null,
      phone: null,
      location: null,
      employeeCount: null,
      foundedYear: null,
      technologies: [],
      responseHash: response.payload ? hashed(response.payload) : null,
    };
  const normalized = organizationFrom(organization);
  if (!normalized)
    return {
      status: "no_match" as const,
      providerOrganizationId: null,
      name: null,
      shortDescription: null,
      industry: null,
      website: null,
      logoUrl: null,
      linkedinUrl: null,
      phone: null,
      location: null,
      employeeCount: null,
      foundedYear: null,
      technologies: [],
      responseHash: hashed(response.payload),
    };
  const snapshot: ApolloOrganizationSnapshot = {
    status: "fresh",
    providerOrganizationId: normalized.id,
    name: normalized.name,
    shortDescription: normalized.shortDescription,
    industry: normalized.industry,
    website: normalized.website,
    logoUrl: normalized.logoUrl,
    linkedinUrl: normalized.linkedinUrl,
    phone: normalized.phone,
    location: normalized.location,
    employeeCount: normalized.employeeCount,
    foundedYear: normalized.foundedYear,
    technologies: normalized.technologies,
    responseHash: hashed(response.payload),
  };
  const hasUsableCompanyData = Boolean(
    snapshot.providerOrganizationId ||
    snapshot.shortDescription ||
    snapshot.industry ||
    snapshot.website ||
    snapshot.linkedinUrl ||
    snapshot.phone ||
    snapshot.location ||
    snapshot.employeeCount != null ||
    snapshot.foundedYear != null
  );
  return hasUsableCompanyData
    ? snapshot
    : { ...snapshot, status: "no_match" as const };
}

export async function searchApolloOrganizations(query: string): Promise<{
  status: ApolloStatus;
  results: ApolloOrganizationSearchResult[];
}> {
  const value = query.trim().slice(0, 240);
  if (value.length < 3) return { status: "invalid", results: [] };
  const normalizedQueryName = normalizedCompanyName(value);
  let domain: string | null = null;
  try {
    const candidate = value.includes("://") ? value : `https://${value}`;
    const url = new URL(candidate);
    if (!url.pathname || url.pathname === "/") domain = validPublicHostname(url.hostname);
  } catch {
    domain = null;
  }
  if (domain) {
    const enriched = await enrichApolloOrganization({ domain, matchMethod: "domain" });
    if (enriched.status === "fresh" && enriched.providerOrganizationId && enriched.name) {
      return {
        status: "fresh",
        results: [{
          providerOrganizationId: enriched.providerOrganizationId,
          name: enriched.name,
          shortDescription: enriched.shortDescription,
          website: enriched.website,
          logoUrl: enriched.logoUrl,
          linkedinUrl: enriched.linkedinUrl,
          phone: enriched.phone,
          industry: enriched.industry,
          location: enriched.location,
          employeeCount: enriched.employeeCount,
          foundedYear: enriched.foundedYear,
          technologies: enriched.technologies,
          exact: true,
          detailsLoaded: true,
        }],
      };
    }
    if (enriched.status !== "no_match")
      return { status: enriched.status, results: [] };
  }
  const body: JsonRecord = {
    page: 1,
    per_page: 8,
    ...(domain
      ? { q_organization_domains_list: [domain] }
      : { q_organization_name: value }),
  };
  const response = await apolloRequest("/mixed_companies/search", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (response.status !== "fresh" || !response.payload)
    return { status: response.status, results: [] };
  const raw = [response.payload.organizations, response.payload.companies, response.payload.accounts]
    .flatMap((value) => Array.isArray(value) ? value : []);
  const seen = new Set<string>();
  const results = raw
    .map(organizationFrom)
    .filter((value): value is NonNullable<ReturnType<typeof organizationFrom>> => Boolean(value?.name))
    .filter((value) => {
      if (seen.has(value.id)) return false;
      seen.add(value.id);
      return true;
    })
    .map((value) => ({
      providerOrganizationId: value.id,
      name: value.name!,
      shortDescription: value.shortDescription,
      website: value.website,
      logoUrl: value.logoUrl,
      linkedinUrl: value.linkedinUrl,
      phone: value.phone,
      industry: value.industry,
      location: value.location,
      employeeCount: value.employeeCount,
      foundedYear: value.foundedYear,
      technologies: value.technologies,
      exact: domain
        ? hostnameFrom(value.website) === domain
        : normalizedCompanyName(value.name!) === normalizedQueryName,
      detailsLoaded: false,
    }))
    .slice(0, 8);
  return { status: "fresh", results };
}

export function normalizeApolloSelection(value: unknown) {
  const source = record(value);
  if (!source) return null;
  const name = text(source.name, 240);
  const shortDescription = text(source.shortDescription, 1_600);
  const providerOrganizationId = text(source.providerOrganizationId, 200);
  const website = publicProfileUrl(source.website);
  const logoUrl = publicProfileUrl(source.logoUrl);
  const linkedinUrl = publicProfileUrl(source.linkedinUrl, "linkedin.com");
  const phone = phoneFrom(source);
  const industry = text(source.industry, 240);
  const location = text(source.location, 400);
  const technologies = Array.isArray(source.technologies)
    ? Array.from(new Set(source.technologies.map((item) => text(item, 120)).filter((item): item is string => Boolean(item)))).slice(0, 40)
    : [];
  if (!name || !providerOrganizationId) return null;
  return {
    providerOrganizationId,
    name,
    shortDescription,
    website,
    logoUrl,
    linkedinUrl,
    phone,
    industry,
    location,
    employeeCount: integer(source.employeeCount),
    foundedYear: integer(source.foundedYear),
    technologies,
  };
}
