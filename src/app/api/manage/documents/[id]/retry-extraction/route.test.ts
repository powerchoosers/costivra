import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOperator = vi.hoisted(() => vi.fn());
const retryFailedDocumentExtraction = vi.hoisted(() => vi.fn());

vi.mock("@/lib/manage/auth", () => ({
  requireInternalOperator,
  manageApiError: () => ({ status: 500, error: "The owner portal could not complete that request." }),
}));
vi.mock("@/lib/documents/retry-extraction", () => ({ retryFailedDocumentExtraction }));

import { PATCH } from "@/app/api/manage/documents/[id]/retry-extraction/route";

const documentId = "00000000-0000-4000-8000-000000000001";

describe("manage extraction retry route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireInternalOperator.mockResolvedValue({ db: {}, userId: "operator-1" });
  });

  it("rejects malformed identifiers before starting recovery", async () => {
    const response = await PATCH(new Request("https://costivra.ai"), { params: Promise.resolve({ id: "bad" }) });
    expect(response.status).toBe(400);
    expect(retryFailedDocumentExtraction).not.toHaveBeenCalled();
  });

  it("returns a conflict when the document belongs in human review", async () => {
    retryFailedDocumentExtraction.mockResolvedValue({ outcome: "not_retryable" });
    const response = await PATCH(new Request("https://costivra.ai"), { params: Promise.resolve({ id: documentId }) });
    expect(response.status).toBe(409);
  });

  it("returns the safe recovery result", async () => {
    retryFailedDocumentExtraction.mockResolvedValue({ outcome: "processed", status: "needs_review", warning: "Operator review is required." });
    const response = await PATCH(new Request("https://costivra.ai"), { params: Promise.resolve({ id: documentId }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, status: "needs_review", warning: "Operator review is required." });
  });

  it("reports a repaired interrupted job without rerunning extraction", async () => {
    retryFailedDocumentExtraction.mockResolvedValue({ outcome: "reconciled", status: "needs_review", invoiceId: "invoice-1" });
    const response = await PATCH(new Request("https://costivra.ai"), { params: Promise.resolve({ id: documentId }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, status: "needs_review", repaired: true, warning: null });
  });
});
