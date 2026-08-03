import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import {
  companyLookupFromWebsite,
  enrichApolloOrganization,
  getApolloCreditUsage,
  isApolloConfigured,
  normalizeApolloSelection,
  searchApolloOrganizations,
} from "@/lib/integrations/apollo";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Apollo enrichment adapter", () => {
  it("uses a fixed Apollo host and a domain derived from a stored public website", async () => {
    vi.stubEnv("APOLLO_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      organization: {
        id: "apollo-org-1",
        name: "Example",
        short_description: "A concise company description.",
        industry: "Software",
        website_url: "https://example.com",
        linkedin_url: "https://www.linkedin.com/company/example",
        phone_number: "+1 512-555-0147",
        city: "Austin",
        state: "Texas",
        country: "United States",
        estimated_num_employees: 120,
        founded_year: 2012,
        logo_url: "https://zenprospect-production.s3.amazonaws.com/uploads/picture.jpg",
        current_technologies: [{ name: "Salesforce" }, { name: "HubSpot" }],
        unapproved_field: "must not be stored",
      },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const lookup = companyLookupFromWebsite("https://www.example.com/about");
    expect(lookup).toEqual({ domain: "example.com", matchMethod: "domain" });
    const result = await enrichApolloOrganization(lookup!);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://api.apollo.io/api/v1/organizations/enrich?domain=example.com");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "GET", cache: "no-store", redirect: "error" });
    expect(result).toMatchObject({ status: "fresh", providerOrganizationId: "apollo-org-1", industry: "Software", website: "https://example.com/", linkedinUrl: "https://www.linkedin.com/company/example", phone: "+1 512-555-0147", location: "Austin, Texas, United States", employeeCount: 120, foundedYear: 2012, technologies: ["Salesforce", "HubSpot"] });
    expect(result).not.toHaveProperty("unapproved_field");
  });

  it("rejects local, private, and credential-bearing lookup URLs", () => {
    expect(companyLookupFromWebsite("http://localhost:3000")).toBeNull();
    expect(companyLookupFromWebsite("https://127.0.0.1")).toBeNull();
    expect(companyLookupFromWebsite("https://app.localhost")).toBeNull();
    expect(companyLookupFromWebsite("https://client:secret@example.com")).toBeNull();
    expect(companyLookupFromWebsite("https://example.com:8443")).toBeNull();
    expect(companyLookupFromWebsite("file:///tmp/customer.pdf")).toBeNull();
  });

  it("reports configuration without exposing the provider key", () => {
    vi.stubEnv("APOLLO_API_KEY", "");
    expect(isApolloConfigured()).toBe(false);
    vi.stubEnv("APOLLO_API_KEY", "server-key");
    expect(isApolloConfigured()).toBe(true);
    vi.stubEnv("APOLLO_API_KEY", "placeholder");
    expect(isApolloConfigured()).toBe(false);
    vi.stubEnv("APOLLO_API_KEY", "[redacted]");
    expect(isApolloConfigured()).toBe(false);
  });

  it("returns a bounded lead-credit summary without provider profile details", async () => {
    vi.stubEnv("APOLLO_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: "apollo-user-id",
      email: "owner@example.test",
      effective_num_lead_credits: 5_000,
      num_lead_credits_used: 230,
      num_credits_remaining: 3_346,
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const usage = await getApolloCreditUsage();

    expect(fetchMock.mock.calls[0][0]).toBe("https://api.apollo.io/api/v1/users/api_profile?include_credit_usage=true");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "GET", cache: "no-store", redirect: "error" });
    expect(usage).toMatchObject({
      status: "fresh",
      leadCredits: { limit: 5_000, used: 1_654, remaining: 3_346 },
    });
    expect(usage).not.toHaveProperty("email");
    expect(usage).not.toHaveProperty("id");
  });

  it("drops unsafe provider links before they can be stored or rendered", async () => {
    vi.stubEnv("APOLLO_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      organization: {
        id: "apollo-org-1",
        website_url: "javascript:alert('xss')",
        linkedin_url: "https://not-linkedin.example/profile",
      },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await enrichApolloOrganization({ domain: "example.com", matchMethod: "domain" });

    expect(result).toMatchObject({ status: "fresh", website: null, linkedinUrl: null, logoUrl: null });
  });

  it("maps provider throttling to a safe status without parsing provider error content", async () => {
    vi.stubEnv("APOLLO_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("sensitive provider detail", { status: 429 })));

    const result = await enrichApolloOrganization({ domain: "example.com", matchMethod: "domain" });

    expect(result.status).toBe("rate_limited");
    expect(result.shortDescription).toBeNull();
    expect(result.responseHash).toBeNull();
  });

  it("does not treat an empty provider organization as a successful profile", async () => {
    vi.stubEnv("APOLLO_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ organization: {} }), { status: 200 })));

    const result = await enrichApolloOrganization({ domain: "example.com", matchMethod: "domain" });

    expect(result.status).toBe("no_match");
    expect(result.responseHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("enriches an exact domain directly so the add-account flow receives complete details", async () => {
    vi.stubEnv("APOLLO_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      organization: {
        id: "apollo-org-2",
        name: "Example, Inc.",
        short_description: "A complete company profile.",
        primary_domain: "example.com",
        logo_url: "https://apolloio-prod.s3.amazonaws.com/logo.png",
        corporate_phone: "+1 800-555-0100",
        current_technologies: [{ name: "NetSuite" }],
      },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchApolloOrganizations("https://example.com");

    expect(fetchMock.mock.calls[0][0]).toBe("https://api.apollo.io/api/v1/organizations/enrich?domain=example.com");
    expect(result.results[0]).toMatchObject({
      providerOrganizationId: "apollo-org-2",
      shortDescription: "A complete company profile.",
      exact: true,
      detailsLoaded: true,
      phone: "+1 800-555-0100",
      technologies: ["NetSuite"],
    });
  });

  it("uses account matches even when Apollo returns an empty organizations array", async () => {
    vi.stubEnv("APOLLO_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      organizations: [],
      accounts: [{
        id: "apollo-account-id",
        organization_id: "apollo-org-ccm",
        name: "Church of Christ On McDermott Road",
        domain: "ccmcdermott.org",
        phone: "+1 972-712-2727",
        city: "Frisco",
        state: "Texas",
      }],
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchApolloOrganizations("McDermott Road");

    expect(fetchMock.mock.calls[0][0]).toBe("https://api.apollo.io/api/v1/mixed_companies/search");
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      providerOrganizationId: "apollo-org-ccm",
      name: "Church of Christ On McDermott Road",
      website: "https://ccmcdermott.org/",
      phone: "+1 972-712-2727",
      location: "Frisco, Texas",
      detailsLoaded: false,
    });
  });

  it("accepts only a bounded, normalized Apollo selection", () => {
    expect(normalizeApolloSelection({
      providerOrganizationId: "apollo-org-3",
      name: "Example",
      shortDescription: "Useful provider context.",
      website: "https://example.com/",
      linkedinUrl: "https://www.linkedin.com/company/example",
      phone: "+1 512-555-0147",
      technologies: ["Salesforce", "Salesforce", 42, ""],
      employeeCount: 88,
      foundedYear: 2018,
    })).toMatchObject({
      providerOrganizationId: "apollo-org-3",
      name: "Example",
      shortDescription: "Useful provider context.",
      website: "https://example.com/",
      technologies: ["Salesforce"],
    });
    expect(normalizeApolloSelection({ providerOrganizationId: "x", name: "Bad", website: "javascript:alert(1)", logoUrl: "javascript:alert(1)" })).toMatchObject({ website: null, logoUrl: null });
  });
});
