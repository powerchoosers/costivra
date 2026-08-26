import { describe, expect, it } from "vitest";
import { extractGmailAttachments, filterMatchingMessages } from "./mailbox-sync";

describe("vendor mailbox matching", () => {
  it("keeps only messages with attachments matching an approved sender or subject", () => {
    const messages = [
      { providerMessageId: "1", sender: "billing@vendor.example", subject: "Invoice", receivedAt: "2026-08-25T00:00:00Z", attachments: [{ id: "a", filename: "bill.pdf", contentType: "application/pdf", size: 10 }] },
      { providerMessageId: "2", sender: "other@example.com", subject: "Invoice", receivedAt: "2026-08-25T00:00:00Z", attachments: [] },
    ];
    expect(filterMatchingMessages(messages, [{ sender_domains: ["vendor.example"], sender_addresses: [], subject_terms: [] }]).map((message) => message.providerMessageId)).toEqual(["1"]);
  });
});

describe("Gmail attachment parsing", () => {
  it("finds nested attachment references and inline attachment data", () => {
    const payload = {
      mimeType: "multipart/mixed",
      parts: [
        {
          mimeType: "multipart/alternative",
          parts: [{ mimeType: "text/plain", filename: "", body: { data: "ignored" } }],
        },
        {
          partId: "2",
          mimeType: "application/pdf",
          filename: "invoice.pdf",
          body: { attachmentId: "gmail-attachment-id", size: 1234 },
        },
        {
          partId: "3",
          mimeType: "text/csv",
          filename: "usage.csv",
          body: { data: "dGVzdA", size: 4 },
        },
      ],
    };

    expect(extractGmailAttachments(payload)).toEqual([
      { id: "gmail-attachment-id", filename: "invoice.pdf", contentType: "application/pdf", size: 1234 },
      { id: "inline:3", filename: "usage.csv", contentType: "text/csv", size: 4, inlineData: "dGVzdA" },
    ]);
  });
});
