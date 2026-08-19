import { describe, expect, it } from "vitest";

import {
  canUseMailbox,
  formatMailboxSender,
  isValidMailboxLocalPart,
  mailboxAddress,
  mailboxDomains,
} from "./mailboxes";

describe("CRM mailbox seats", () => {
  it("accepts deliberate mailbox local parts and rejects unsafe ones", () => {
    expect(isValidMailboxLocalPart("l.patterson")).toBe(true);
    expect(isValidMailboxLocalPart("sales-team")).toBe(true);
    expect(isValidMailboxLocalPart("Lewis Patterson")).toBe(false);
    expect(isValidMailboxLocalPart("../admin")).toBe(false);
    expect(isValidMailboxLocalPart("sales.")).toBe(false);
  });

  it("defaults addresses to Costivra.ai and permits configured verified-domain candidates", () => {
    expect(mailboxAddress(" L.Patterson ")).toBe(
      "l.patterson@costivra.ai",
    );
    expect(
      formatMailboxSender("Lewis\nPatterson", "l.patterson@costivra.ai"),
    ).toBe("Lewis Patterson <l.patterson@costivra.ai>");
    expect(mailboxDomains("costivra.io,costivra.ai,invalid")).toEqual([
      "costivra.ai",
      "costivra.io",
    ]);
    expect(mailboxAddress("outreach", "costivra.io")).toBe(
      "outreach@costivra.io",
    );
  });

  it("limits operators to assigned or shared active mailboxes", () => {
    const personal = {
      mailboxType: "personal" as const,
      assignedTo: "lewis",
      status: "active" as const,
    };
    expect(canUseMailbox("owner", "owner", personal)).toBe(true);
    expect(canUseMailbox("operator", "lewis", personal)).toBe(true);
    expect(canUseMailbox("operator", "someone-else", personal)).toBe(false);
    expect(
      canUseMailbox("operator", "someone-else", {
        ...personal,
        mailboxType: "shared",
      }),
    ).toBe(true);
    expect(
      canUseMailbox("owner", "owner", { ...personal, status: "disabled" }),
    ).toBe(false);
  });
});
