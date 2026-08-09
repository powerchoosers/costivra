import { describe, expect, it } from "vitest";
import { canUseSequenceMailbox } from "@/lib/manage/sequences/mailbox-policy";

const mailbox = (overrides: Partial<Parameters<typeof canUseSequenceMailbox>[1]> = {}) => ({
  status: "active",
  canSend: true,
  mailboxType: "personal",
  assignedTo: "operator-1",
  ...overrides,
});

describe("canUseSequenceMailbox", () => {
  it("allows an operator to enroll from their active personal mailbox", () => {
    expect(canUseSequenceMailbox("operator-1", mailbox())).toBe(true);
  });

  it("allows an operator to enroll from an active shared mailbox", () => {
    expect(
      canUseSequenceMailbox("operator-2", mailbox({ mailboxType: "shared", assignedTo: null })),
    ).toBe(true);
  });

  it("rejects another operator's personal mailbox", () => {
    expect(canUseSequenceMailbox("operator-2", mailbox())).toBe(false);
  });

  it("rejects disabled or send-disabled mailboxes", () => {
    expect(canUseSequenceMailbox("operator-1", mailbox({ status: "disabled" }))).toBe(false);
    expect(canUseSequenceMailbox("operator-1", mailbox({ canSend: false }))).toBe(false);
  });
});
