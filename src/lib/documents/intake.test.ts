import { describe, expect, it } from "vitest";
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
});
