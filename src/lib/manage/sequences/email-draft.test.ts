import { describe, expect, it } from "vitest";
import { normalizeSequenceEmailDraft } from "./email-draft";

describe("sequence email draft normalization", () => {
  it("keeps valid merge fields and produces a safe HTML fallback", () => {
    expect(normalizeSequenceEmailDraft({
      subjectTemplate: "Quick question for {{company_name}}",
      bodyText: "Hi {{first_name}},\n\nWould a short conversation help?",
    })).toEqual({
      subjectTemplate: "Quick question for {{company_name}}",
      bodyText: "Hi {{first_name}},\n\nWould a short conversation help?",
      bodyHtml: "<p>Hi {{first_name}},</p><p>Would a short conversation help?</p>",
    });
  });

  it("rejects an unknown merge field and strips unsafe markup", () => {
    expect(normalizeSequenceEmailDraft({
      subjectTemplate: "Hello {{unknown_field}}",
      bodyText: "Hi there",
    })).toBeNull();

    expect(normalizeSequenceEmailDraft({
      subjectTemplate: "Hello",
      bodyHtml: "<p>Hi there</p><script>bad()</script>",
    })).toEqual({
      subjectTemplate: "Hello",
      bodyText: "Hi there",
      bodyHtml: "<p>Hi there</p>",
    });
  });
});
