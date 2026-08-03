import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn(() => ({ status: 500, error: "Request failed" })));
const isApolloConfigured = vi.hoisted(() => vi.fn());
const searchApolloOrganizations = vi.hoisted(() => vi.fn());

vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));
vi.mock("@/lib/integrations/apollo", () => ({ isApolloConfigured, searchApolloOrganizations }));

import { GET } from "@/app/api/manage/accounts/search/route";

describe("account company search route", () => {
  beforeEach(() => {
    requireInternalOperator.mockReset().mockResolvedValue({});
    isApolloConfigured.mockReset().mockReturnValue(true);
    searchApolloOrganizations.mockReset();
  });

  it("does not call Apollo before the query is useful", async () => {
    const response = await GET(new Request("https://costivra.ai/api/manage/accounts/search?q=ab"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ configured: true, results: [] });
    expect(searchApolloOrganizations).not.toHaveBeenCalled();
  });

  it("returns bounded search results to an authenticated internal operator", async () => {
    searchApolloOrganizations.mockResolvedValue({
      status: "fresh",
      results: [{ providerOrganizationId: "org-1", name: "Example", exact: true }],
    });
    const response = await GET(new Request("https://costivra.ai/api/manage/accounts/search?q=Example"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ configured: true, results: [{ providerOrganizationId: "org-1" }] });
    expect(searchApolloOrganizations).toHaveBeenCalledWith("Example");
  });

  it("does not expose provider details when Apollo is unavailable", async () => {
    searchApolloOrganizations.mockResolvedValue({ status: "forbidden", results: [] });
    const response = await GET(new Request("https://costivra.ai/api/manage/accounts/search?q=Example"));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "Apollo could not complete the company search." });
  });
});
