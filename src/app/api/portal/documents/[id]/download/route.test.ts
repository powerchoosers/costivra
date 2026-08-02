import { beforeEach, describe, expect, it, vi } from "vitest";

const requirePortalContext = vi.hoisted(() => vi.fn());

vi.mock("@/lib/portal/repository", () => ({ requirePortalContext }));

import { GET } from "@/app/api/portal/documents/[id]/download/route";

const documentId = "11111111-1111-4111-8111-111111111111";
const organizationId = "22222222-2222-4222-8222-222222222222";

function databaseForDocument(document: { storage_path: string; status?: string } | null) {
  const filters: Array<[string, string]> = [];
  const createSignedUrl = vi.fn().mockResolvedValue({
    data: { signedUrl: "https://storage.example.invalid/signed-document" },
    error: null,
  });
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: string) => {
      filters.push([column, value]);
      return query;
    }),
    maybeSingle: vi.fn().mockResolvedValue({ data: document, error: null }),
  };
  return {
    filters,
    createSignedUrl,
    db: {
      from: vi.fn(() => query),
      storage: {
        from: vi.fn(() => ({ createSignedUrl })),
      },
    },
  };
}

describe("customer document download authorization", () => {
  beforeEach(() => {
    requirePortalContext.mockReset();
  });

  it("does not create a signed URL when the document is outside the active tenant", async () => {
    const database = databaseForDocument(null);
    requirePortalContext.mockResolvedValue({
      db: database.db,
      organizationId,
    });

    const response = await GET(new Request(`https://costivra.ai/api/portal/documents/${documentId}/download`), {
      params: Promise.resolve({ id: documentId }),
    });

    expect(response.status).toBe(404);
    expect(database.filters).toEqual([
      ["id", documentId],
      ["organization_id", organizationId],
    ]);
    expect(database.createSignedUrl).not.toHaveBeenCalled();
  });

  it("signs only the storage path returned by the tenant-scoped query", async () => {
    const database = databaseForDocument({
      storage_path: `${organizationId}/documents/invoice.pdf`,
      status: "ready",
    });
    requirePortalContext.mockResolvedValue({
      db: database.db,
      organizationId,
    });

    const response = await GET(new Request(`https://costivra.ai/api/portal/documents/${documentId}/download`), {
      params: Promise.resolve({ id: documentId }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://storage.example.invalid/signed-document",
    );
    expect(database.createSignedUrl).toHaveBeenCalledWith(
      `${organizationId}/documents/invoice.pdf`,
      60,
    );
  });

  it("never signs a quarantined source file", async () => {
    const database = databaseForDocument({
      storage_path: `${organizationId}/quarantine/manual/invoice.pdf`,
      status: "quarantined",
    });
    requirePortalContext.mockResolvedValue({
      db: database.db,
      organizationId,
    });

    const response = await GET(
      new Request(`https://costivra.ai/api/portal/documents/${documentId}/download`),
      { params: Promise.resolve({ id: documentId }) },
    );

    expect(response.status).toBe(423);
    expect(database.createSignedUrl).not.toHaveBeenCalled();
  });
});
