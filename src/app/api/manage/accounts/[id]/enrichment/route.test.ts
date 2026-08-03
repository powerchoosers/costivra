import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn(() => ({ status: 500, error: "Request failed" })));
const companyLookupFromWebsite = vi.hoisted(() => vi.fn());
const enrichApolloOrganization = vi.hoisted(() => vi.fn());
const isApolloConfigured = vi.hoisted(() => vi.fn());

vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));
vi.mock("@/lib/integrations/apollo", () => ({ companyLookupFromWebsite, enrichApolloOrganization, isApolloConfigured }));

import { POST } from "@/app/api/manage/accounts/[id]/enrichment/route";

const accountId = "11111111-1111-4111-8111-111111111111";

function query(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return chain;
}

function database(input: { website: string | null; existing?: { status: string; fetched_at: string; lookup_domain?: string } | null; claimed?: boolean }) {
  const organizationQuery = query({ data: { id: accountId }, error: null });
  const profileQuery = query({ data: { website: input.website }, error: null });
  const enrichmentQuery = query({ data: input.existing ?? null, error: null });
  const enrichmentUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const enrichmentUpdate = vi.fn(() => ({ eq: enrichmentUpdateEq }));
  const enrichmentUpsert = vi.fn().mockResolvedValue({ error: null });
  const enrichmentTable = { ...enrichmentQuery, update: enrichmentUpdate, upsert: enrichmentUpsert };
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  return {
    auditInsert,
    enrichmentUpsert,
    db: {
      from: vi.fn((table: string) =>
        table === "organizations" ? organizationQuery :
          table === "crm_account_profiles" ? profileQuery :
            table === "internal_audit_events" ? { insert: auditInsert } : enrichmentTable,
      ),
      rpc: vi.fn().mockResolvedValue({ data: input.claimed ?? false, error: null }),
    },
  };
}

describe("manual account enrichment", () => {
  beforeEach(() => {
    requireInternalOperator.mockReset();
    companyLookupFromWebsite.mockReset();
    enrichApolloOrganization.mockReset();
    isApolloConfigured.mockReset();
    isApolloConfigured.mockReturnValue(true);
  });

  it("does not claim work or spend a provider credit when Apollo is not configured", async () => {
    const store = database({ website: "https://example.com" });
    requireInternalOperator.mockResolvedValue({ db: store.db, userId: "staff-1" });
    companyLookupFromWebsite.mockReturnValue({ domain: "example.com", matchMethod: "domain" });
    isApolloConfigured.mockReturnValue(false);

    const response = await POST(new Request(`https://costivra.ai/api/manage/accounts/${accountId}/enrichment`, { method: "POST" }), { params: Promise.resolve({ id: accountId }) });

    expect(response.status).toBe(503);
    expect(store.auditInsert).not.toHaveBeenCalled();
    expect(store.db.rpc).not.toHaveBeenCalled();
    expect(enrichApolloOrganization).not.toHaveBeenCalled();
  });

  it("never accepts a browser-provided domain when the stored account website is missing", async () => {
    const store = database({ website: null });
    requireInternalOperator.mockResolvedValue({ db: store.db, userId: "staff-1" });
    companyLookupFromWebsite.mockReturnValue(null);

    const response = await POST(new Request(`https://costivra.ai/api/manage/accounts/${accountId}/enrichment`, { method: "POST", body: JSON.stringify({ domain: "attacker.example" }) }), { params: Promise.resolve({ id: accountId }) });

    expect(response.status).toBe(409);
    expect(companyLookupFromWebsite).toHaveBeenCalledWith(null);
    expect(store.db.rpc).not.toHaveBeenCalled();
    expect(enrichApolloOrganization).not.toHaveBeenCalled();
  });

  it("returns a fresh stored snapshot without spending another Apollo credit", async () => {
    const store = database({ website: "https://example.com", existing: { status: "fresh", fetched_at: new Date().toISOString(), lookup_domain: "example.com" } });
    requireInternalOperator.mockResolvedValue({ db: store.db, userId: "staff-1" });
    companyLookupFromWebsite.mockReturnValue({ domain: "example.com", matchMethod: "domain" });

    const response = await POST(new Request(`https://costivra.ai/api/manage/accounts/${accountId}/enrichment`, { method: "POST" }), { params: Promise.resolve({ id: accountId }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, cached: true });
    expect(store.db.rpc).not.toHaveBeenCalled();
    expect(enrichApolloOrganization).not.toHaveBeenCalled();
  });

  it("does not reuse a fresh snapshot from a different lookup domain", async () => {
    const store = database({ website: "https://example.com", existing: { status: "fresh", fetched_at: new Date().toISOString(), lookup_domain: "different.example" } });
    requireInternalOperator.mockResolvedValue({ db: store.db, userId: "staff-1" });
    companyLookupFromWebsite.mockReturnValue({ domain: "example.com", matchMethod: "domain" });

    const response = await POST(new Request(`https://costivra.ai/api/manage/accounts/${accountId}/enrichment`, { method: "POST" }), { params: Promise.resolve({ id: accountId }) });

    expect(response.status).toBe(409);
    expect(store.db.rpc).toHaveBeenCalledWith(
      "claim_internal_crm_account_enrichment",
      { p_organization_id: accountId },
    );
    expect(store.auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      action: "crm.account_apollo_enrichment_requested",
      organization_id: accountId,
    }));
    expect(enrichApolloOrganization).not.toHaveBeenCalled();
  });

  it("returns the real provider outcome instead of reporting a false success", async () => {
    const store = database({ website: "https://example.com", claimed: true });
    requireInternalOperator.mockResolvedValue({ db: store.db, userId: "staff-1" });
    companyLookupFromWebsite.mockReturnValue({ domain: "example.com", matchMethod: "domain" });
    enrichApolloOrganization.mockResolvedValue({
      status: "rate_limited",
      providerOrganizationId: null,
      shortDescription: null,
      industry: null,
      website: null,
      linkedinUrl: null,
      phone: null,
      location: null,
      employeeCount: null,
      foundedYear: null,
      responseHash: null,
    });

    const response = await POST(new Request(`https://costivra.ai/api/manage/accounts/${accountId}/enrichment`, { method: "POST" }), { params: Promise.resolve({ id: accountId }) });

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      status: "rate_limited",
      error: expect.stringMatching(/rate-limiting/i),
    });
    expect(store.auditInsert).toHaveBeenNthCalledWith(1, expect.objectContaining({ action: "crm.account_apollo_enrichment_requested" }));
    expect(store.auditInsert).toHaveBeenNthCalledWith(2, expect.objectContaining({ action: "crm.account_apollo_enrichment_completed" }));
  });

  it("stores only the allowlisted snapshot and reports a completed fresh lookup", async () => {
    const store = database({ website: "https://example.com", claimed: true });
    requireInternalOperator.mockResolvedValue({ db: store.db, userId: "staff-1" });
    companyLookupFromWebsite.mockReturnValue({ domain: "example.com", matchMethod: "domain" });
    enrichApolloOrganization.mockResolvedValue({
      status: "fresh",
      providerOrganizationId: "apollo-org-1",
      shortDescription: "Example profile",
      industry: "Software",
      website: "https://example.com/",
      linkedinUrl: "https://www.linkedin.com/company/example",
      phone: "+1 512-555-0147",
      location: "Austin, Texas, United States",
      employeeCount: 120,
      foundedYear: 2012,
      responseHash: "a".repeat(64),
    });

    const response = await POST(new Request(`https://costivra.ai/api/manage/accounts/${accountId}/enrichment`, { method: "POST" }), { params: Promise.resolve({ id: accountId }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, cached: false, status: "fresh" });
    expect(store.enrichmentUpsert).toHaveBeenCalledWith(expect.objectContaining({
      organization_id: accountId,
      provider: "apollo",
      lookup_domain: "example.com",
      status: "fresh",
      response_hash: "a".repeat(64),
      last_error_code: null,
    }), { onConflict: "organization_id" });
    expect(store.auditInsert).toHaveBeenNthCalledWith(2, expect.objectContaining({
      action: "crm.account_apollo_enrichment_completed",
      safe_metadata: expect.objectContaining({ outcome: "fresh", snapshot_received: true }),
    }));
  });
});
