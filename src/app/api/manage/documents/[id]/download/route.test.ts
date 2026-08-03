import { beforeEach, describe, expect, it, vi } from "vitest";

const requireInternalOperator = vi.hoisted(() => vi.fn());
const manageApiError = vi.hoisted(() => vi.fn(() => ({ status: 500, error: "Request failed" })));

vi.mock("@/lib/manage/auth", () => ({ requireInternalOperator, manageApiError }));

import { GET } from "@/app/api/manage/documents/[id]/download/route";

const documentId = "11111111-1111-4111-8111-111111111111";
const organizationId = "22222222-2222-4222-8222-222222222222";

function databaseForDocument(document: Record<string, unknown> | null) {
  const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: "https://storage.example.invalid/private-source" }, error: null });
  const documentQuery = {
    select: vi.fn(() => documentQuery),
    eq: vi.fn(() => documentQuery),
    maybeSingle: vi.fn().mockResolvedValue({ data: document, error: null }),
  };
  const insert = vi.fn().mockResolvedValue({ error: null });
  return {
    createSignedUrl,
    insert,
    db: {
      from: vi.fn((table: string) => table === "documents" ? documentQuery : { insert }),
      storage: { from: vi.fn(() => ({ createSignedUrl })) },
    },
  };
}

describe("internal CRM document download", () => {
  beforeEach(() => {
    requireInternalOperator.mockReset();
    manageApiError.mockClear();
  });

  it("refuses an unknown document before creating a signed URL", async () => {
    const database = databaseForDocument(null);
    requireInternalOperator.mockResolvedValue({ db: database.db, userId: "staff-1" });

    const response = await GET(new Request(`https://costivra.ai/api/manage/documents/${documentId}/download`), { params: Promise.resolve({ id: documentId }) });

    expect(response.status).toBe(404);
    expect(database.createSignedUrl).not.toHaveBeenCalled();
    expect(database.insert).not.toHaveBeenCalled();
  });

  it("issues a forced-download URL, then writes a safe audit event", async () => {
    const database = databaseForDocument({
      id: documentId,
      organization_id: organizationId,
      storage_path: `${organizationId}/documents/source.pdf`,
      original_filename: "June invoice.pdf",
      status: "ready",
      mime_type: "application/pdf",
      byte_size: 1234,
      document_type: "invoice",
    });
    requireInternalOperator.mockResolvedValue({ db: database.db, userId: "staff-1" });

    const response = await GET(new Request(`https://costivra.ai/api/manage/documents/${documentId}/download`), { params: Promise.resolve({ id: documentId }) });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://storage.example.invalid/private-source");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(database.insert).toHaveBeenCalledWith(expect.objectContaining({
      actor_id: "staff-1",
      organization_id: organizationId,
      action: "crm.document_signed_url_issued",
      resource_id: documentId,
      safe_metadata: { mime_type: "application/pdf", byte_size: 1234, document_type: "invoice" },
    }));
    expect(database.createSignedUrl).toHaveBeenCalledWith(`${organizationId}/documents/source.pdf`, 60, { download: "June invoice.pdf" });
  });

  it("does not sign or audit a file that is still quarantined or processing", async () => {
    const database = databaseForDocument({
      id: documentId,
      organization_id: organizationId,
      storage_path: `${organizationId}/documents/pending.pdf`,
      original_filename: "Pending.pdf",
      status: "quarantined",
      mime_type: "application/pdf",
      byte_size: 1234,
      document_type: "invoice",
    });
    requireInternalOperator.mockResolvedValue({ db: database.db, userId: "staff-1" });

    const response = await GET(new Request(`https://costivra.ai/api/manage/documents/${documentId}/download`), { params: Promise.resolve({ id: documentId }) });

    expect(response.status).toBe(423);
    expect(database.createSignedUrl).not.toHaveBeenCalled();
    expect(database.insert).not.toHaveBeenCalled();
  });

  it("does not sign or audit an original removed by retention", async () => {
    const database = databaseForDocument({
      id: documentId,
      organization_id: organizationId,
      storage_path: `${organizationId}/documents/source.pdf`,
      original_filename: "Source.pdf",
      status: "ready",
      source_purged_at: "2026-08-03T00:00:00.000Z",
      mime_type: "application/pdf",
      byte_size: 1234,
      document_type: "invoice",
    });
    requireInternalOperator.mockResolvedValue({ db: database.db, userId: "staff-1" });

    const response = await GET(
      new Request(`https://costivra.ai/api/manage/documents/${documentId}/download`),
      { params: Promise.resolve({ id: documentId }) },
    );

    expect(response.status).toBe(410);
    expect(database.createSignedUrl).not.toHaveBeenCalled();
    expect(database.insert).not.toHaveBeenCalled();
  });

  it("fails closed for an unexpected document status", async () => {
    const database = databaseForDocument({
      id: documentId,
      organization_id: organizationId,
      storage_path: `${organizationId}/documents/source.pdf`,
      original_filename: "Source.pdf",
      status: "provider_complete",
      mime_type: "application/pdf",
      byte_size: 1234,
      document_type: "invoice",
    });
    requireInternalOperator.mockResolvedValue({ db: database.db, userId: "staff-1" });

    const response = await GET(new Request(`https://costivra.ai/api/manage/documents/${documentId}/download`), { params: Promise.resolve({ id: documentId }) });

    expect(response.status).toBe(423);
    expect(database.createSignedUrl).not.toHaveBeenCalled();
    expect(database.insert).not.toHaveBeenCalled();
  });
});
