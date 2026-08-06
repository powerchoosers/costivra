import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOwner = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn(() => ({ status: 500, error: "Request failed" })));
vi.mock("@/lib/manage/auth", () => ({ requireInternalOwner, manageApiError }));

import { PATCH } from "@/app/api/manage/opportunity-trust/[id]/route";

const opportunityId = "11111111-1111-4111-8111-111111111111";
const organizationId = "22222222-2222-4222-8222-222222222222";
const accountId = "33333333-3333-4333-8333-333333333333";
const evidenceId = "44444444-4444-4444-8444-444444444444";
const documentId = "55555555-5555-4555-8555-555555555555";

function request(body: Record<string, unknown>) {
  return new Request(`https://costivra.ai/api/manage/opportunity-trust/${opportunityId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createDatabase(input: { evidenceDocumentId?: string; sourceDocumentId?: string } = {}) {
  const updates: Array<Record<string, unknown>> = [];
  const links: unknown[] = [];
  const audits: Array<Record<string, unknown>> = [];
  const opportunity = {
    select: vi.fn(() => opportunity),
    eq: vi.fn(() => opportunity),
    maybeSingle: vi.fn().mockResolvedValue({
      data: {
        id: opportunityId,
        organization_id: organizationId,
        expense_account_id: accountId,
        source_expense_id: null,
        generated_by: "manual",
      },
      error: null,
    }),
    update: vi.fn((value: Record<string, unknown>) => {
      updates.push(value);
      let calls = 0;
      const chain = {
        eq: vi.fn(() => {
          calls += 1;
          return calls === 2 ? Promise.resolve({ error: null }) : chain;
        }),
      };
      return chain;
    }),
  };
  const evidence = {
    select: vi.fn(() => evidence),
    in: vi.fn().mockResolvedValue({
      data: [{ id: evidenceId, document_id: input.evidenceDocumentId ?? documentId }],
      error: null,
    }),
  };
  const expenses = {
    select: vi.fn(() => expenses),
    eq: vi.fn(() => {
      const calls = expenses.eq.mock.calls.length;
      return calls === 2
        ? Promise.resolve({ data: [{ document_id: input.sourceDocumentId ?? documentId }], error: null })
        : expenses;
    }),
  };
  const documents = {
    select: vi.fn(() => documents),
    in: vi.fn(() => documents),
    eq: vi.fn().mockResolvedValue({ data: [{ id: input.evidenceDocumentId ?? documentId }], error: null }),
  };
  const opportunityEvidence = {
    upsert: vi.fn((value: unknown) => {
      links.push(value);
      return Promise.resolve({ error: null });
    }),
  };
  const audit = {
    insert: vi.fn((value: Record<string, unknown>) => {
      audits.push(value);
      return Promise.resolve({ error: null });
    }),
  };
  const db = {
    from: vi.fn((table: string) => table === "opportunities"
      ? opportunity
      : table === "evidence_references"
        ? evidence
        : table === "expenses"
          ? expenses
          : table === "documents"
            ? documents
            : table === "opportunity_evidence"
              ? opportunityEvidence
              : audit),
  };
  return { db, updates, links, audits, opportunityEvidence };
}

describe("opportunity trust review evidence attachment", () => {
  beforeEach(() => {
    requireInternalOwner.mockReset();
  });

  it("requires an explicit evidence selection", async () => {
    const database = createDatabase();
    requireInternalOwner.mockResolvedValue({ db: database.db, userId: "owner-id" });

    const response = await PATCH(request({ action: "attach_evidence" }), { params: Promise.resolve({ id: opportunityId }) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Select at least one evidence reference." });
    expect(database.opportunityEvidence.upsert).not.toHaveBeenCalled();
  });

  it("rejects evidence from a different expense account document", async () => {
    const database = createDatabase({ evidenceDocumentId: "66666666-6666-4666-8666-666666666666", sourceDocumentId: documentId });
    requireInternalOwner.mockResolvedValue({ db: database.db, userId: "owner-id" });

    const response = await PATCH(request({ action: "attach_evidence", evidenceIds: [evidenceId] }), { params: Promise.resolve({ id: opportunityId }) });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Evidence must come from a source document linked to this expense account." });
    expect(database.opportunityEvidence.upsert).not.toHaveBeenCalled();
  });

  it("links same-account evidence and records the review", async () => {
    const database = createDatabase();
    requireInternalOwner.mockResolvedValue({ db: database.db, userId: "owner-id" });

    const response = await PATCH(request({ action: "attach_evidence", evidenceIds: [evidenceId, evidenceId] }), { params: Promise.resolve({ id: opportunityId }) });

    expect(response.status).toBe(200);
    expect(database.links).toEqual([[{ opportunity_id: opportunityId, evidence_reference_id: evidenceId, role: "supporting" }]]);
    expect(database.updates).toEqual([expect.objectContaining({ trust_state: "manual_note" })]);
    expect(database.audits).toEqual([expect.objectContaining({ action: "opportunity.trust_review.attach_evidence" })]);
  });
});
