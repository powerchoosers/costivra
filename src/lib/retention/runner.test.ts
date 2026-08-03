import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { runRetention } from "@/lib/retention/runner";

function database() {
  const remove = vi.fn().mockResolvedValue({ error: null });
  const documentUpdateIn = vi.fn().mockResolvedValue({ error: null });
  const attachmentUpdateIn = vi.fn().mockResolvedValue({ error: null });
  const finalizeEq = vi.fn().mockResolvedValue({ error: null });
  const finalize = vi.fn(() => ({ eq: finalizeEq }));
  const insert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn().mockResolvedValue({ data: { id: "run-1" }, error: null }),
    })),
  }));

  const documentSelect = () => {
    let statuses: string[] = [];
    const chain = {
      is: vi.fn(() => chain),
      in: vi.fn((_column: string, values: string[]) => {
        statuses = values;
        return chain;
      }),
      lt: vi.fn(() => chain),
      or: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(async () => ({
        data: statuses.includes("ready")
          ? [{ id: "original-1", storage_path: "org/original.pdf", status: "ready" }]
          : [{ id: "quarantine-1", storage_path: "org/quarantine.pdf", status: "quarantined" }],
        error: null,
      })),
    };
    return chain;
  };
  const attachmentSelect = () => {
    const chain = {
      not: vi.fn(() => chain),
      is: vi.fn(() => chain),
      lt: vi.fn(() => chain),
      or: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn().mockResolvedValue({
        data: [{ id: "attachment-1", quarantine_storage_path: "org/mail.pdf" }],
        error: null,
      }),
    };
    return chain;
  };
  const from = vi.fn((table: string) => {
    if (table === "retention_runs") return { insert, update: finalize };
    if (table === "documents")
      return {
        select: vi.fn(documentSelect),
        update: vi.fn(() => ({ in: documentUpdateIn })),
      };
    if (table === "inbound_email_attachments")
      return {
        select: vi.fn(attachmentSelect),
        update: vi.fn(() => ({ in: attachmentUpdateIn })),
      };
    throw new Error(`Unexpected table ${table}`);
  });
  return {
    db: {
      from,
      storage: { from: vi.fn(() => ({ remove })) },
    },
    remove,
    documentUpdateIn,
    attachmentUpdateIn,
    finalize,
  };
}

describe("retention runner", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records candidates without deleting anything in report mode", async () => {
    const store = database();
    const result = await runRetention(store.db as never, {
      now: new Date("2026-08-03T00:00:00.000Z"),
      policy: { enforce: false, quarantineDays: 30, originalDays: null, batchSize: 100 },
    });
    expect(result.mode).toBe("report");
    expect(result.candidates).toEqual({
      quarantinedDocuments: 1,
      quarantinedAttachments: 1,
      originalDocuments: 0,
    });
    expect(result.purged).toEqual({
      quarantinedDocuments: 0,
      quarantinedAttachments: 0,
      originalDocuments: 0,
    });
    expect(store.remove).not.toHaveBeenCalled();
  });

  it("removes storage objects before marking metadata as purged", async () => {
    const store = database();
    const result = await runRetention(store.db as never, {
      now: new Date("2026-08-03T00:00:00.000Z"),
      policy: { enforce: true, quarantineDays: 30, originalDays: 365, batchSize: 100 },
    });
    expect(result.status).toBe("completed");
    expect(result.purged).toEqual(result.candidates);
    expect(store.remove).toHaveBeenCalledTimes(3);
    expect(store.documentUpdateIn).toHaveBeenCalledTimes(2);
    expect(store.attachmentUpdateIn).toHaveBeenCalledTimes(1);
    expect(store.remove.mock.invocationCallOrder[0])
      .toBeLessThan(store.documentUpdateIn.mock.invocationCallOrder[0]);
  });
});
