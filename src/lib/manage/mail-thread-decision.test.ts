import { describe, expect, it } from "vitest";
import { getMailThreadDecision } from "@/lib/manage/mail-thread-decision";
import type { ManageMailMessage, ManageMailThread } from "@/lib/manage/types";

const thread: ManageMailThread = {
  id: "thread-1",
  organizationId: "account-1",
  mailboxId: "mailbox-1",
  mailboxAddress: "team@costivra.ai",
  organizationName: "Apex Logistics",
  contactId: "contact-1",
  contactName: "Alex Rivera",
  contactEmail: "alex@example.com",
  subject: "Invoice question",
  participants: ["alex@example.com"],
  snippet: "Can you clarify this bill?",
  status: "open",
  isStarred: false,
  unreadCount: 1,
  lastMessageAt: "2026-08-20T12:00:00.000Z",
  folder: "inbox",
  latestDirection: "inbound",
  latestStatus: "received",
};

const inboundMessage: ManageMailMessage = {
  id: "message-1",
  threadId: thread.id,
  organizationId: thread.organizationId,
  mailboxId: thread.mailboxId,
  direction: "inbound",
  folder: "inbox",
  fromAddress: "alex@example.com",
  toAddresses: ["team@costivra.ai"],
  ccAddresses: [],
  subject: thread.subject,
  textBody: "Can you clarify this bill?",
  htmlBody: null,
  providerStatus: "received",
  attachments: [],
  sentAt: null,
  receivedAt: "2026-08-20T12:00:00.000Z",
  createdAt: "2026-08-20T12:00:00.000Z",
};

describe("mail thread decision context", () => {
  it("recommends an accountable reply for a linked inbound conversation", () => {
    const decision = getMailThreadDecision(thread, [inboundMessage]);

    expect(decision.heading).toBe("Review the latest client message");
    expect(decision.recommendsReply).toBe(true);
    expect(decision.facts).toContainEqual({ label: "Account", value: "Linked to Apex Logistics" });
  });

  it("keeps unscanned files ahead of a reply recommendation", () => {
    const decision = getMailThreadDecision(thread, [{
      ...inboundMessage,
      attachments: [{ id: "attachment-1", filename: "invoice.pdf", status: "scanning" }],
    }]);

    expect(decision.heading).toBe("Source files are still being checked");
    expect(decision.recommendsReply).toBe(false);
    expect(decision.facts).toContainEqual({ label: "Source files", value: "1 file checking" });
  });

  it("does not recommend a reply before the thread is attributed to an account", () => {
    const decision = getMailThreadDecision({ ...thread, organizationId: null, organizationName: null }, [inboundMessage]);

    expect(decision.heading).toBe("Link client context before replying");
    expect(decision.recommendsReply).toBe(false);
  });
});
