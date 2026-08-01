import { describe, expect, it } from "vitest";
import { buildManageAssistantSuggestions } from "@/lib/manage/assistant";
import type { ManageData } from "@/lib/manage/types";

function fixture(): ManageData {
  return {
    operator: { id: "staff-1", email: "owner@example.test", fullName: "Owner", role: "owner", avatarUrl: null },
    staff: [],
    accounts: [
      {
        id: "account-1", name: "Synthetic Account", legalName: null, industry: null, stage: null,
        primaryContact: null, primaryEmail: null, memberCount: 1, documentCount: 0,
        opportunityCount: 0, openTaskCount: 1, marketingOptInCount: 0,
        latestMarketingConsentAt: null, lastContactedAt: null, nextFollowUpAt: null,
        nextStep: null, privateNotes: null, createdAt: "2026-01-01T00:00:00.000Z", logoUrl: null,
      },
    ],
    contacts: [],
    tasks: [
      {
        id: "task-1", organizationId: "account-1", organizationName: "Synthetic Account",
        contactId: null, title: "Review", taskType: "follow_up", priority: "normal",
        status: "open", dueAt: "2026-01-02T00:00:00.000Z", notes: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    activities: [],
    mail: {
      folder: "inbox", threads: [], selectedThread: null, messages: [], unreadCount: 2,
      mailboxes: [], selectedMailboxId: null, fromAddress: "", inboxAddress: "", inboundReady: true,
    },
  };
}

describe("buildManageAssistantSuggestions", () => {
  it("prioritizes the current CRM section and uses live counts", () => {
    const suggestions = buildManageAssistantSuggestions(
      fixture(),
      "accounts",
      [{ eventType: "email.received", occurredAt: "2026-01-03T00:00:00.000Z" }],
      new Date("2026-01-04T00:00:00.000Z"),
    );

    expect(suggestions).toHaveLength(3);
    expect(suggestions[0]).toMatchObject({ id: "accounts-next-step", kind: "account" });
    expect(suggestions[0].detail).toContain("1 account");
    expect(suggestions.find((suggestion) => suggestion.id === "tasks-overdue")?.detail).toContain("1 overdue");
  });

  it("uses verified receiving-event counts in mail suggestions", () => {
    const suggestions = buildManageAssistantSuggestions(
      fixture(),
      "mail",
      [
        { eventType: "email.received", occurredAt: "2026-01-03T00:00:00.000Z" },
        { eventType: "email.delivered", occurredAt: "2026-01-03T00:00:00.000Z" },
      ],
      new Date("2026-01-04T00:00:00.000Z"),
    );

    expect(suggestions[0].id).toBe("mail-inbound");
    expect(suggestions[0].detail).toBe("2 unread · 1 recent receiving event");
  });
});
