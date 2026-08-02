import { describe, expect, it } from "vitest";
import { buildEmailDraftContext, normalizeEmailDraft } from "./email-draft";

describe("contextual email drafts", () => {
  it("keeps the model context bounded and removes instruction-like markup", () => {
    const context = buildEmailDraftContext({
      recipient: { fullName: "Ada Client", email: "ada@example.com" },
      account: { name: "Acme", notes: "x".repeat(2_000) },
      vendors: Array.from({ length: 15 }, (_, index) => ({ name: `Vendor ${index}` })),
      activities: Array.from({ length: 15 }, (_, index) => ({ subject: `Activity ${index}`, occurredAt: "2026-08-02" })),
      conversations: [],
    });
    expect(context.account?.notes).toHaveLength(900);
    expect(context.vendors).toHaveLength(12);
    expect(context.activities).toHaveLength(12);
  });

  it("accepts only safe generated HTML", () => {
    expect(normalizeEmailDraft({ bodyHtml: '<p>Hello</p><script>bad()</script>', subject: " Follow up " }))
      .toEqual({ bodyHtml: "<p>Hello</p>", subject: "Follow up" });
    expect(normalizeEmailDraft({ bodyHtml: "" })).toBeNull();
  });

  it("guarantees a known recipient greeting and preserves a natural sign-off", () => {
    expect(normalizeEmailDraft(
      { bodyHtml: "<p>Hi Ada,</p><p>Quick note.</p><p>Talk soon,<br>Lewis</p>", subject: "Hello" },
      { recipientFirstName: "Ada", senderFirstName: "Lewis" },
    )?.bodyHtml).toBe("<p>Hi Ada,</p><p>Quick note.</p><p>Talk soon,<br>Lewis</p>");
  });

  it("adds safe fallback framing when the model omits it", () => {
    const draft = normalizeEmailDraft(
      { bodyHtml: "<p>Quick note.</p>" },
      { recipientFirstName: null, senderFirstName: "Lewis Patterson" },
    );
    expect(draft?.bodyHtml).toContain("<p>Hi [First name],</p>");
    expect(draft?.bodyHtml).toContain("<p>Best,<br>Lewis</p>");
  });
});
