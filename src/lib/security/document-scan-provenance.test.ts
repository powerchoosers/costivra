import { describe, expect, it, vi } from "vitest";
import { persistDocumentSecurityScan } from "@/lib/security/document-scan-provenance";

function database() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  return {
    db: {
      from: vi.fn(() => ({ insert })),
    } as never,
    insert,
  };
}

describe("document security scan provenance", () => {
  it("persists only the safe structured result for a clean scan", async () => {
    const { db, insert } = database();

    await persistDocumentSecurityScan({
      db,
      organizationId: "11111111-1111-4111-8111-111111111111",
      documentId: "22222222-2222-4222-8222-222222222222",
      sha256: "a".repeat(64),
      sourceType: "manual_upload",
      scan: {
        status: "clean",
        provider: "cloudmersive",
        providerHttpStatus: 200,
        detail: "provider detail is not persisted",
      },
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: "11111111-1111-4111-8111-111111111111",
        document_id: "22222222-2222-4222-8222-222222222222",
        sha256: "a".repeat(64),
        source_type: "manual_upload",
        provider: "cloudmersive",
        status: "clean",
        safe_code: "clean",
        provider_http_status: 200,
      }),
    );
    expect(insert.mock.calls[0][0]).not.toHaveProperty("detail");
  });

  it("uses the scanner code as the safe code for blocked or unavailable results", async () => {
    const { db, insert } = database();

    await persistDocumentSecurityScan({
      db,
      organizationId: "11111111-1111-4111-8111-111111111111",
      documentId: "22222222-2222-4222-8222-222222222222",
      sha256: "b".repeat(64),
      sourceType: "quarantine_rescan",
      scan: {
        status: "failed",
        provider: "generic",
        code: "provider_unavailable",
        detail: "do not store provider details",
      },
    });

    expect(insert.mock.calls[0][0]).toEqual(
      expect.objectContaining({ status: "failed", safe_code: "provider_unavailable" }),
    );
    expect(insert.mock.calls[0][0]).not.toHaveProperty("detail");
  });
});
