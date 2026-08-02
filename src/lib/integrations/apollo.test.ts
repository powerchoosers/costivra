import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import {
  companyLookupFromWebsite,
  enrichApolloOrganization,
  isApolloConfigured,
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
        short_description: "A concise company description.",
        industry: "Software",
        website_url: "https://example.com",
        linkedin_url: "https://www.linkedin.com/company/example",
        city: "Austin",
        state: "Texas",
        country: "United States",
        estimated_num_employees: 120,
        founded_year: 2012,
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
    expect(result).toMatchObject({ status: "fresh", providerOrganizationId: "apollo-org-1", industry: "Software", website: "https://example.com/", linkedinUrl: "https://www.linkedin.com/company/example", location: "Austin, Texas, United States", employeeCount: 120, foundedYear: 2012 });
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

    expect(result).toMatchObject({ status: "fresh", website: null, linkedinUrl: null });
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
});
