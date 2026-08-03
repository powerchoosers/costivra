import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const scanFileForMalware = vi.hoisted(() => vi.fn());
const ingestDocumentBuffer = vi.hoisted(() => vi.fn());
vi.mock("@/lib/security/malware-scanner", () => ({ scanFileForMalware }));
vi.mock("@/lib/documents/intake", () => ({ ingestDocumentBuffer }));

import { releaseQuarantinedInboundAttachments } from "@/lib/email/quarantine-release";

function database(removeError: { message: string } | null) {
  const attachmentUpdates: Array<Record<string, unknown>> = [];
  const remove = vi.fn().mockResolvedValue({ error: removeError });
  const updateAttachment = vi.fn((payload: Record<string, unknown>) => {
    attachmentUpdates.push(payload);
    return { eq: vi.fn().mockResolvedValue({ error: null }) };
  });
  let attachmentSelectCount = 0;
  const db = {
    from: vi.fn((table: string) => {
      if (table === "inbound_email_attachments") {
        return {
          select: vi.fn(() => {
            attachmentSelectCount += 1;
            if (attachmentSelectCount === 1) {
              const chain = {
                eq: vi.fn(() => chain),
                limit: vi.fn().mockResolvedValue({
                  data: [{
                    id: "attachment-1",
                    event_id: "event-1",
                    filename: "invoice.pdf",
                    content_type: "application/pdf",
                    quarantine_storage_path: "org/quarantine/invoice.pdf",
                  }],
                  error: null,
                }),
              };
              return chain;
            }
            return {
              eq: vi.fn().mockResolvedValue({
                data: [{ processing_status: "failed" }],
                error: null,
              }),
            };
          }),
          update: updateAttachment,
        };
      }
      if (table === "inbound_email_events") {
        const eventEq = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
        return { update: vi.fn(() => ({ eq: eventEq })) };
      }
      throw new Error(`Unexpected table ${table}`);
    }),
    storage: {
      from: vi.fn(() => ({
        download: vi.fn().mockResolvedValue({ data: new Blob(["invoice"]), error: null }),
        remove,
      })),
    },
  };
  return { db, attachmentUpdates, remove, updateAttachment };
}

describe("quarantined inbound attachment release", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scanFileForMalware.mockResolvedValue({ status: "infected" });
  });

  it("keeps the private path recoverable when Storage deletion fails", async () => {
    const store = database({ message: "storage unavailable" });

    const result = await releaseQuarantinedInboundAttachments({
      db: store.db as never,
      organizationId: "organization-1",
    });

    expect(result.rejected).toBe(1);
    expect(store.remove).toHaveBeenCalledWith(["org/quarantine/invoice.pdf"]);
    expect(store.attachmentUpdates).toHaveLength(1);
    expect(store.attachmentUpdates[0]).toMatchObject({
      scan_status: "infected",
      processing_status: "failed",
    });
    expect(store.attachmentUpdates[0]).not.toHaveProperty("quarantine_storage_path");
  });

  it("clears the path only after Storage confirms deletion", async () => {
    const store = database(null);

    await releaseQuarantinedInboundAttachments({
      db: store.db as never,
      organizationId: "organization-1",
    });

    expect(store.attachmentUpdates).toHaveLength(2);
    expect(store.attachmentUpdates[1]).toMatchObject({
      quarantine_storage_path: null,
      quarantine_purged_at: expect.any(String),
    });
    expect(store.remove.mock.invocationCallOrder[0])
      .toBeLessThan(store.updateAttachment.mock.invocationCallOrder[1]);
  });
});
