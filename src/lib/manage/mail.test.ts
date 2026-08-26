import { describe, expect, it } from "vitest";
import {
  deliveryFailureLedgerUpdate,
  emailHtmlToText,
  isValidEmail,
  mailRequestHash,
  normalizeEmailAddress,
  normalizeSubject,
  parseAddressList,
  safeSnippet,
  sanitizeEmailHtml,
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

  it("keeps useful email formatting while removing executable markup", () => {
    const sanitized = sanitizeEmailHtml(
      '<h2 onclick="steal()">Hello</h2><script>alert(1)</script><a href="javascript:bad()">bad</a><a href="https://costivra.ai" style="color:red">safe</a>',
    );
    expect(sanitized).toContain("<h2>Hello</h2>");
    expect(sanitized).not.toContain("script");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).toContain('href="https://costivra.ai"');
  });

  it("preserves approved alignment while discarding unrelated styles", () => {
    expect(sanitizeEmailHtml('<div style="text-align:center;position:fixed;color:red">Centered</div>'))
      .toBe('<div style="text-align:center">Centered</div>');
  });

  it("creates a readable plain-text fallback from rich email HTML", () => {
    expect(emailHtmlToText("<h2>Hello</h2><p>First<br>Second</p><ul><li>Item</li></ul>"))
      .toBe("Hello\nFirst\nSecond\n• Item");
  });

  it("keeps an accepted provider send in sent state when local persistence fails", () => {
    const update = deliveryFailureLedgerUpdate(
      "resend-message-id",
      "Mailbox insert failed",
      "2026-07-31T12:00:00.000Z",
    );
    expect(update.status).toBe("sent");
    expect(update.provider_reference).toBe("resend-message-id");
    expect(update.failure_class).toBe("provider_ambiguous");
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
    expect(update.failure_class).toBe("safe_retry");
  });
});
