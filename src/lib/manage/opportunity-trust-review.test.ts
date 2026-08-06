import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const requireInternalOwner = vi.hoisted(() => vi.fn());
vi.mock("@/lib/manage/auth", () => ({ requireInternalOwner }));

import { getManageOpportunityTrustReviewData } from "@/lib/manage/opportunity-trust-review";

const opportunityId = "11111111-1111-4111-8111-111111111111";
const organizationId = "22222222-2222-4222-8222-222222222222";
const accountId = "33333333-3333-4333-8333-333333333333";
const documentId = "44444444-4444-4444-8444-444444444444";
const evidenceId = "55555555-5555-4555-8555-555555555555";

function query(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "gt", "in", "order"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

describe("owner opportunity trust review data", () => {
  beforeEach(() => requireInternalOwner.mockReset());

  it("offers only evidence from documents linked to the opportunity account", async () => {
    const tables: Record<string, unknown> = {
      opportunities: query({ data: [{
        id: opportunityId,
        organization_id: organizationId,
        expense_account_id: accountId,
        title: "Manual tariff review",
        category: "Commercial electricity",
        estimated_annual_value: "3600.00",
        generated_by: "manual",
        trust_state: null,
        customer_visible: true,
        calculation_result: {},
      }], error: null }),
      organizations: query({ data: [{ id: organizationId, name: "Synthetic workspace" }], error: null }),
      vendors: query({ data: [{ id: "66666666-6666-4666-8666-666666666666", canonical_name: "Synthetic utility" }], error: null }),
      organization_vendors: query({ data: [{ id: "77777777-7777-4777-8777-777777777777", vendor_id: "66666666-6666-4666-8666-666666666666" }], error: null }),
      expense_accounts: query({ data: [{ id: accountId, organization_vendor_id: "77777777-7777-4777-8777-777777777777", external_account_reference: "UTIL-001" }], error: null }),
      expenses: query({ data: [{ id: "88888888-8888-4888-8888-888888888888", organization_id: organizationId, expense_account_id: accountId, location_id: null, document_id: documentId }], error: null }),
      locations: query({ data: [], error: null }),
      opportunity_evidence: query({ data: [], error: null }),
      documents: query({ data: [{ id: documentId, original_filename: "synthetic-bill.pdf" }], error: null }),
      evidence_references: query({ data: [{ id: evidenceId, document_id: documentId, page_number: 2, field_path: "invoice.totalAmount", text_excerpt: "Total current charges: $300.00" }], error: null }),
    };
    const db = { from: vi.fn((table: string) => tables[table]) };
    requireInternalOwner.mockResolvedValue({ db, userId: "owner-id" });

    const result = await getManageOpportunityTrustReviewData();

    expect(result.items).toHaveLength(1);
    expect(result.items[0].evidenceOptions).toEqual([{
      id: evidenceId,
      documentId,
      filename: "synthetic-bill.pdf",
      pageNumber: 2,
      fieldPath: "invoice.totalAmount",
      excerpt: "Total current charges: $300.00",
    }]);
  });
});
