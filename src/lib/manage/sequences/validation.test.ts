import { describe, expect, it } from "vitest";
import { renderTemplate, unresolvedTemplateTokens, validateSequenceDraft } from "./validation";

describe("sequence validation", () => {
  it("allows only the pilot token allowlist", () => {
    expect(unresolvedTemplateTokens("Hi {{first_name}} {{contact.secret}} {{company_name}}" )).toEqual(["contact.secret"]);
    expect(renderTemplate("Hi {{first_name}} at {{company_name}}", { first_name: "Ava", company_name: "Acme" })).toBe("Hi Ava at Acme");
  });

  it("requires safe stops and complete ordered steps before activation", () => {
    const result = validateSequenceDraft({ name: "", timezone: "UTC", businessDays: [], sendStartLocal: "16:00", sendEndLocal: "09:00", stopOnReply: false, stopOnBounce: true, stopOnUnsubscribe: true, steps: [] }, { forActivation: true });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining(["A sequence name is required.", "Add at least one step.", "Reply, bounce, and unsubscribe stops are mandatory."]));
  });
});
