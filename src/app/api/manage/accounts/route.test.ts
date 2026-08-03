import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const requireInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn(() => ({ status: 500, error: "Request failed" })));
const enrichApolloOrganization = vi.hoisted(() => vi.fn());
const isApolloConfigured = vi.hoisted(() => vi.fn(() => true));

vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));
vi.mock("@/lib/integrations/apollo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/integrations/apollo")>()),
  enrichApolloOrganization,
  isApolloConfigured,
}));

import { POST } from "@/app/api/manage/accounts/route";

describe("create account route", () => {
  const inserts: Array<{ table: string; value: Record<string, unknown> }> = [];

  beforeEach(() => {
    inserts.length = 0;
    enrichApolloOrganization.mockReset().mockResolvedValue({
      status: "fresh",
      providerOrganizationId: "apollo-org-ccm",
      name: "Church of Christ On McDermott Road",
      shortDescription: "A church serving the Frisco community.",
      industry: "religious institutions",
      website: "https://ccmcdermott.org/",
      logoUrl: "https://cdn.example.com/ccm.png",
      linkedinUrl: "https://www.linkedin.com/company/church-of-christ-on-mcdermott-road",
      phone: "+1 972-712-2727",
      location: "Frisco, Texas, United States",
      employeeCount: 17,
      foundedYear: 1995,
      technologies: ["Google Workspace", "WordPress"],
      responseHash: "hash",
    });
    isApolloConfigured.mockReturnValue(true);

    const db = {
      from(table: string) {
        return {
          insert(value: Record<string, unknown>) {
            inserts.push({ table, value });
            if (table === "organizations") {
              return {
                select() {
                  return { single: async () => ({ data: { id: "new-org-id" }, error: null }) };
                },
              };
            }
            return Promise.resolve({ error: null });
          },
          update() {
            return { eq: async () => ({ error: null }) };
          },
          delete() {
            return { eq: async () => ({ error: null }) };
          },
        };
      },
    };
    requireInternalOperator.mockReset().mockResolvedValue({ db, userId: "operator-id" });
  });

  it("re-enriches the website on the server and persists the complete Apollo snapshot", async () => {
    const response = await POST(new Request("https://costivra.ai/api/manage/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Church of Christ On McDermott Road",
        website: "https://ccmcdermott.org",
        stage: "lead",
        apolloSelection: {
          providerOrganizationId: "partial-result",
          name: "Church of Christ On McDermott Road",
          website: "https://ccmcdermott.org/",
        },
      }),
    }));

    expect(response.status).toBe(201);
    expect(enrichApolloOrganization).toHaveBeenCalledWith({ domain: "ccmcdermott.org", matchMethod: "domain" });
    expect(inserts.find((item) => item.table === "organizations")?.value).toMatchObject({
      industry: "religious institutions",
    });
    expect(inserts.find((item) => item.table === "crm_account_enrichments")?.value).toMatchObject({
      provider_organization_id: "apollo-org-ccm",
      lookup_domain: "ccmcdermott.org",
      short_description: "A church serving the Frisco community.",
      phone: "+1 972-712-2727",
      location: "Frisco, Texas, United States",
      employee_count: 17,
      founded_year: 1995,
      technology_names: ["Google Workspace", "WordPress"],
    });
  });
});
