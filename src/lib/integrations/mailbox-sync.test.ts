import { describe, expect, it } from "vitest";
import { filterMatchingMessages } from "./mailbox-sync";

describe("vendor mailbox matching", () => {
  it("keeps only messages with attachments matching an approved sender or subject", () => {
    const messages = [
      { providerMessageId: "1", sender: "billing@vendor.example", subject: "Invoice", receivedAt: "2026-08-25T00:00:00Z", attachments: [{ id: "a", filename: "bill.pdf", contentType: "application/pdf", size: 10 }] },
      { providerMessageId: "2", sender: "other@example.com", subject: "Invoice", receivedAt: "2026-08-25T00:00:00Z", attachments: [] },
    ];
    expect(filterMatchingMessages(messages, [{ sender_domains: ["vendor.example"], sender_addresses: [], subject_terms: [] }]).map((message) => message.providerMessageId)).toEqual(["1"]);
  });
});
