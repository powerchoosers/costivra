import { describe, expect, it } from "vitest";
import { recordFileCanOpen, type RecordFile } from "@/components/record-files-workspace";

const file = (status: string, href: string | null = "/secure-file"): RecordFile => ({
  id: "document-1",
  name: "invoice.pdf",
  documentType: "invoice",
  status,
  createdAt: "2026-08-02T00:00:00.000Z",
  href,
});

describe("record file availability", () => {
  it.each(["pending_upload", "processing", "quarantined", "rejected", "infected", "provider_complete"])(
    "does not expose an open action while a file is %s",
    (status) => expect(recordFileCanOpen(file(status))).toBe(false),
  );

  it("requires both a safe status and a server route", () => {
    expect(recordFileCanOpen(file("ready"))).toBe(true);
    expect(recordFileCanOpen(file("ready", null))).toBe(false);
  });
});
