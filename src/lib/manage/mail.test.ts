import { describe, expect, it } from "vitest";
import {
  deliveryFailureLedgerUpdate,
  isValidEmail,
  mailRequestHash,
  normalizeEmailAddress,
  normalizeSubject,
  parseAddressList,
  safeSnippet,
} from "./mail";

describe("owner CRM mail policy", () => {
  it("normalizes addresses and recipient lists", () => {
    expect(normalizeEmailAddress("Lewis <LEWIS@Example.com>")).toBe(
      "lewis@example.com",
    );
    expect(
      parseAddressList(
        "Lewis@example.com; second@example.com,lewis@example.com",
      ),
    ).toEqual(["lewis@example.com", "second@example.com"]);
    expect(isValidEmail("not-an-email")).toBe(false);
  });

  it("groups reply and forward subject prefixes", () => {
    expect(normalizeSubject("Re: Fwd: Contract review")).toBe(
      "contract review",
    );
  });

  it("creates a stable request hash without ignoring material changes", () => {
    const base = {
      organizationId: "11111111-1111-4111-8111-111111111111",
      mailboxId: "22222222-2222-4222-8222-222222222222",
      to: ["A@example.com"],
      cc: [] as string[],
      bcc: [] as string[],
      subject: "Follow-up",
      text: "The agreed message",
    };
    expect(mailRequestHash(base)).toBe(
      mailRequestHash({ ...base, to: ["a@example.com"] }),
    );
    expect(mailRequestHash(base)).not.toBe(
      mailRequestHash({ ...base, text: "Changed message" }),
    );
    expect(mailRequestHash(base)).not.toBe(
      mailRequestHash({ ...base, bcc: ["private@example.com"] }),
    );
  });

  it("builds a short plain-text preview", () => {
    expect(safeSnippet("  One\n\n two   three ", 11)).toBe("One two thr");
  });

  it("keeps an accepted provider send in sent state when local persistence fails", () => {
    const update = deliveryFailureLedgerUpdate(
      "resend-message-id",
      "Mailbox insert failed",
      "2026-07-31T12:00:00.000Z",
    );
    expect(update.status).toBe("sent");
    expect(update.provider_reference).toBe("resend-message-id");
    expect(update.last_error).toContain("needs reconciliation");
  });

  it("marks the side effect failed when the provider never accepted it", () => {
    const update = deliveryFailureLedgerUpdate(
      null,
      "Provider unavailable",
      "2026-07-31T12:00:00.000Z",
    );
    expect(update.status).toBe("failed");
    expect(update.completed_at).toBeNull();
  });
});
