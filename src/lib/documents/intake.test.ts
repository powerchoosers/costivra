import { describe, expect, it, vi } from "vitest";

const persistDocumentSecurityScan = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/security/document-scan-provenance", () => ({
  persistDocumentSecurityScan,
}));

import { ingestDocumentBuffer } from "@/lib/documents/intake";

describe("ingestDocumentBuffer security boundary", () => {
  it.each(["unavailable", "failed", "infected"] as const)(
    "refuses a %s malware result before touching persistence",
    async (status) => {
      await expect(
        ingestDocumentBuffer({
          db: {} as never,
          organizationId: "org-1",
          actorType: "service",
          filename: "invoice.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("invoice"),
          auditAction: "document.test",
          malwareScan: { status },
        }),
      ).rejects.toThrow("cannot enter extraction");
    },
  );

  it("records a clean duplicate-detection attempt against the existing document", async () => {
    const query: Record<string, ReturnType<typeof vi.fn>> = {};
    for (const method of ["select", "eq"]) query[method] = vi.fn(() => query);
    query.maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "document-1", original_filename: "invoice.txt" },
      error: null,
    });
    const db = { from: vi.fn(() => query) };

    const result = await ingestDocumentBuffer({
      db: db as never,
      organizationId: "org-1",
      actorType: "service",
      filename: "invoice.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("invoice"),
      auditAction: "document.test",
      malwareScan: { status: "clean", provider: "generic" },
    });

    expect(result).toEqual(expect.objectContaining({ duplicate: true, documentId: "document-1" }));
    expect(persistDocumentSecurityScan).toHaveBeenCalledWith(expect.objectContaining({
      documentId: "document-1",
      sourceType: "duplicate_detection",
      scan: { status: "clean", provider: "generic" },
    }));
  });
});
